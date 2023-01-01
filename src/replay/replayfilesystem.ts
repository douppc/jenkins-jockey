/* global NodeJS, clearTimeout, setTimeout */
import {
	Disposable,
	Event,
	EventEmitter,
	FileChangeEvent,
	FileChangeType,
	FileStat,
	FileSystemProvider,
	FileType,
	Uri
} from 'vscode';
import {ReplayFileChangeEvent, ReplayFileChangeType} from './replayfilechangeevent';
import {TextDecoder, TextEncoder} from 'util';
import {replay} from '.';
import {ReplayDirectory} from './replaydirectory';
import {ReplayFilesEvent} from './replayfilesevent';
import {ReplayFileStat} from './replayfilestat';

const _eventFireTimeout = 5;

/**
 * Provides a filesystem for original and current contents of {@link ReplayFile}s.
 * @internal
 */
export class ReplayFileSystemProvider implements FileSystemProvider {
	private _subscriptions : {[k:string] : Disposable} = {};
	constructor () {
		replay.onDidChangeFiles(this.activeReplayChanged, this);
	}

	getItem (uri: Uri) {
		// The files are a flat list under the root '/'.
		return replay.getFiles().find(f => uri.path === `/${f.fileName}`);
	}

	createDirectory (): void {}
	delete (): void {}
	readDirectory (uri: Uri): [string, FileType][] {
		// The scheme doesn't matter, just return the list of names of the files.
		if (uri.path.length === 0 || uri.path === '/') {
			return replay.getFiles().map(f => [
				f.fileName,
				FileType.File
			]);
		}
		return [];
	}

	readFile (uri : Uri): Uint8Array {
		const item = this.getItem(uri);
		if (item) {
			// The scheme tells us which file content we want (current or original).
			return new TextEncoder().encode(uri.scheme === replay.uriScheme
				? item.content
				: item.originalContent);
		}
		return new Uint8Array();
	}

	rename (): void { }
	stat (uri: Uri): FileStat {
		if (uri.path.length === 0 || uri.path === '/') return new ReplayDirectory('/');
		const item = this.getItem(uri);
		if (item) return new ReplayFileStat(item, uri);
		return new ReplayDirectory('');
	}

	watch (): Disposable {
		// Ignore, fires for all changes...
		return new Disposable(() => { });
	}

	writeFile (uri : Uri, content : Uint8Array) : void {
		const matching = this.getItem(uri);
		if (matching && uri.scheme === replay.uriScheme) {
			matching.content = new TextDecoder().decode(content);
			this._fireSoon({
				'type': FileChangeType.Changed,
				uri
			});
		}
	}

	private _emitter = new EventEmitter<FileChangeEvent[]>();
	private _bufferedEvents: FileChangeEvent[] = [];
	private _fireSoonHandle?: NodeJS.Timer;
	readonly onDidChangeFile: Event<FileChangeEvent[]> = this._emitter.event;
	private _fireSoon (...events: FileChangeEvent[]): void {
		this._bufferedEvents.push(...events);

		if (this._fireSoonHandle) clearTimeout(this._fireSoonHandle);

		this._fireSoonHandle = setTimeout(() => {
			this._emitter.fire(this._bufferedEvents);
			this._bufferedEvents.length = 0;
		}, _eventFireTimeout);
	}

	private activeReplayChanged (e : ReplayFilesEvent) {
		this._fireSoon({
			'type': FileChangeType.Changed,
			'uri': Uri.from({
				'path': '/',
				'scheme': replay.uriScheme
			})
		});
		e.addedFiles.forEach(f => {
			this._fireSoon({
				'type': FileChangeType.Created,
				'uri': f.uri
			});
			this._subscriptions[f.fileName] = f.onDidChangeContent(this.fileContentChanged, this);
		});
		e.removedFiles.forEach(f => {
			this._fireSoon({
				'type': FileChangeType.Deleted,
				'uri': f.uri
			});
			delete this._subscriptions[f.fileName];
		});
	}

	private fileContentChanged (e : ReplayFileChangeEvent) {
		if (e.changeType === ReplayFileChangeType.content) {
			this._fireSoon({
				'type': FileChangeType.Changed,
				'uri': e.file.uri
			});
		} else if (e.changeType === ReplayFileChangeType.origContent) {
			this._fireSoon({
				'type': FileChangeType.Changed,
				'uri': e.file.origUri
			});
		}
	}
}
