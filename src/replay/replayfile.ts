import {EventEmitter, FileStat, FileType, Uri} from 'vscode';
import {ReplayFileChangeEvent, ReplayFileChangeType} from './replayfilechangeevent';
import {replay} from '.';
import {ReplayFileData} from '../service';
export class ReplayFile implements FileStat {
	protected _data;
	protected _content;
	protected _onDidChangeContent = new EventEmitter<ReplayFileChangeEvent>();
	private _ctime = Date.now();
	private _mtime = this._ctime;

	/** @internal */
	constructor (data : ReplayFileData) {
		this._data = data;
		this._content = data.contents;
	}

	get data () { return this._data; }
	get type () { return FileType.File; }
	get ctime () { return this._ctime; }
	get mtime () { return this._mtime; }
	get size () { return this._content.length; }
	get fileName () {
		// eslint-disable-next-line no-magic-numbers
		return `${this._data.formName.substring(2)}.groovy`;
	}

	get label () { return this._data.label; }
	get content () { return this._content; }
	set content (c : string) {
		if (c !== this._content) {
			this._content = c;
			this._onDidChangeContent.fire(new ReplayFileChangeEvent(this, ReplayFileChangeType.content));
		}
	}

	get originalContent () { return this._data.contents; }
	get uri () {
		return Uri.from({
			'path': `/${this.fileName}`,
			'scheme': replay.uriScheme
		});
	}

	get origUri () {
		return Uri.from({
			'path': `/${this.fileName}`,
			'scheme': replay.origUriScheme
		});
	}

	public revert () { this._content = this._data.contents; }
	public onDidChangeContent = this._onDidChangeContent.event;
}
