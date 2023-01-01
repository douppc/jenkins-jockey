/* global NodeJS */
import {
	Diagnostic,
	DiagnosticSeverity,
	Disposable,
	DocumentLink,
	DocumentLinkProvider,
	FileType,
	languages,
	Position,
	Range,
	TextDocument,
	Uri,
	window,
	workspace
} from 'vscode';
import {BuildStatus} from '../model';
import {replay} from '.';
import {RestApi} from '../service';

const _logFetchInterval = 3000;
const _entireLineCol = 1000;
// eslint-disable-next-line max-len
const _linkRegex = /(?<pre>at\s+[^(\n:]+\(|\/vars\/)(?<lt>(?<fn>[^:)]+)(?::\s*(?<ln>\d+)?)?)(?::\s*(?<msg>[^@]+?)\s*@\s*line\s*\d+\s*,\s*column\s*(?<cn>\d+))?/u;

type LogProblem = {
	isThrow : boolean,
	logRange : Range,
	msg: string | undefined,
	srcLine : number | undefined,
	srcCol : number | undefined,
};

type LogFileProblems = {
	[k: string] : {
		entries : LogProblem[],
		srcUri : Uri
	}
};

export class ReplayLogHandler implements Disposable, DocumentLinkProvider {
	private _logTimer : NodeJS.Timer | undefined = undefined;
	private _replayJobSub : Disposable | undefined = undefined;
	private _log = '';
	private _logChannel = window.createOutputChannel('Jenkins Jockey Replay Log', replay.logLangId);
	private _logOffset = 0;
	private _nextLogLinksLine = 0;
	private _logLinks : DocumentLink[] = [];
	private _diaCol = languages.createDiagnosticCollection('Jenkins Jockey');

	constructor () {
		replay.onDidChangeActive(this.activeReplayBuildChanged, this);
	}

	private findPreviousMessage (logDoc : TextDocument, line: number, prevLine: number) : string | undefined {
		for (let l = line - 1; l > prevLine; l--) {
			const thisLine = logDoc.lineAt(l);
			if (thisLine.firstNonWhitespaceCharacterIndex === 0) return thisLine.text;
		}
		return undefined;
	}

	private addDiagnostics (logDoc : TextDocument, uri: Uri, entries: LogProblem[]) {
		const existingDiag = this._diaCol.get(uri);
		const newDiag : Diagnostic[] = [];
		if (existingDiag) newDiag.push(...existingDiag);
		let prevLine = 0;
		entries.forEach(e => {
			if (!e.srcLine) return;
			const startChar = e.srcCol ? e.srcCol - 1 : 0;
			if (!e.msg && e.isThrow) e.msg = this.findPreviousMessage(logDoc, e.logRange.end.line, prevLine);
			prevLine = e.logRange.end.line;
			if (!e.msg) return;
			newDiag.push(new Diagnostic(
				new Range(e.srcLine - 1, startChar, e.srcLine - 1,
					e.srcCol ? startChar + 1 : _entireLineCol - 1),
				e.msg, DiagnosticSeverity.Error));
		});
		if ((!existingDiag && newDiag.length > 0) ||
				(existingDiag && newDiag.length !== existingDiag.length)) {
			this._diaCol.set(uri, newDiag);
		}
	}

	private parseLogEntries (document: TextDocument, startLine: number) {
		const entries : LogFileProblems = {};
		for (let l = startLine; l < document.lineCount; ++l) {
			const line = document.lineAt(l);
			const match = line.text.match(_linkRegex);
			if (match && match.groups && match.index) {
				const uri = Uri.from({
					'path': `/${match.groups.fn}`,
					'scheme': replay.uriScheme
				});
				const uriStr = uri.toString();
				if (!(uriStr in entries)) {
					entries[uriStr] = {
						'entries': [],
						'srcUri': uri
					};
				}
				const startLogCol = new Position(l, match.index + match.groups.pre.length);
				entries[uriStr].entries.push({
					'isThrow': match.groups.pre.startsWith('at'),
					'logRange': new Range(startLogCol, startLogCol.translate(0, match.groups.lt.length)),
					'msg': 'msg' in match.groups ? match.groups.msg : undefined,
					'srcCol': 'cn' in match.groups ? Number.parseInt(match.groups.cn, 10) : undefined,
					'srcLine': 'ln' in match.groups ? Number.parseInt(match.groups.ln, 10) : undefined
				});
			}
		}
		return entries;
	}

	private async filterReplayProblems (entries: LogFileProblems) {
		const newEntries : LogFileProblems = {};
		const statProms = Object.values(entries).map(async e => ({
			'entry': e,
			'stat': await workspace.fs.stat(e.srcUri)
		}));
		const stats = await Promise.all(statProms);
		stats.forEach(s => {
			if (s.stat.type === FileType.File) newEntries[s.entry.srcUri.toString()] = s.entry;
		});
		return newEntries;
	}

	async provideDocumentLinks (document: TextDocument):
			Promise<DocumentLink[]> {
		const problems = await this.filterReplayProblems(
			this.parseLogEntries(document, this._nextLogLinksLine));
		this._nextLogLinksLine = document.lineCount;
		const links : DocumentLink[] = [];
		Object.values(problems).forEach(file => {
			links.push(...file.entries.map(entry => {
				let frag = '';
				if (entry.srcLine) {
					frag = `L${entry.srcLine.toString()}`;
					if (entry.srcCol) frag += `,${entry.srcCol.toString()}`;
				}
				return new DocumentLink(entry.logRange, file.srcUri.with({'fragment': frag}));
			}));
			this.addDiagnostics(document, file.srcUri, file.entries);
		});
		return links;
	}

	dispose () {
		if (this._logTimer) clearTimeout(this._logTimer);
		if (this._replayJobSub) this._replayJobSub.dispose();
	}

	private activeReplayBuildChanged () {
		if (this._logTimer) clearTimeout(this._logTimer);
		if (this._replayJobSub) {
			this._replayJobSub.dispose();
			this._replayJobSub = undefined;
		}
		this.resetLog();
		const activeBuild = replay.getActive();
		if (activeBuild) {
			this._logChannel.show(false);
			if (activeBuild.status === BuildStatus.building) this.fetchMoreLog();
			else this.fetchEntireLog();
		}
	}

	private resetLog () {
		this._log = '';
		this._logOffset = 0;
		this._logChannel.clear();
		this._nextLogLinksLine = 0;
		this._logLinks.length = 0;
		this._diaCol.clear();
	}

	private async fetchMoreLog () {
		const active = replay.getActive();
		if (active) {
			const inc = await RestApi.getIncrementalBuildLog(active.url, this._logOffset);
			this._log += inc.data;
			if (inc.more) this._logTimer = setTimeout(this.fetchMoreLog.bind(this), _logFetchInterval);
			this.updateForLog(this._logOffset);
			this._logOffset = inc.offset;
		}
	}

	private async fetchEntireLog () {
		const active = replay.getActive();
		if (active) {
			this._log = await RestApi.getBuildLog(active.url);
			this.updateForLog(0);
		}
	}

	private updateForLog (offset: number) {
		this._logChannel.append(this._log.substring(offset));
	}

}
