import {ReplayFile} from './replayfile';

/**
 * Event fired when the files in the active replay change.
 * @remarks
 * This event can be used to monitor when files change due to activating a replay or if the files are updated
 * due the active replay building and encountering new files.
 *
 * @see {@link replay.onDidChangeFiles}
 * @event
 */
export class ReplayFilesEvent {
	private _addedFiles;
	private _removedFiles;

	/** @internal */
	constructor (addedFiles: ReplayFile[], removedFiles: ReplayFile[]) {
		this._addedFiles = addedFiles;
		this._removedFiles = removedFiles;
	}

	/**
	 * The files that have been added since the last event was fired.
	 */
	get addedFiles () { return this._addedFiles; }

	/**
	 * The files that have been removed since the last event was fired.
	 */
	get removedFiles () { return this._removedFiles; }
}
