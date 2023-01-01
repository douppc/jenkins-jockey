import {ReplayFile} from './replayfile';

/**
 * The type of the change to a replay file.
 * @see {@link ReplayFileChangeEvent}
 * @see {@link ReplayFile.onDidChangeContent}
 */
export enum ReplayFileChangeType {

	/**
	 * The change occurred in the current contents of the file.
	 * @see {ReplayFile}
	 */
	content,

	/**
	 * The change occurred in the original contents of the file.
	 * @see {ReplayFile}
	 */
	origContent
}

/**
 * Event fired when the contents of a {@link ReplayFile} change.
 * @see {@link ReplayFile.onDidChangeContent}
 * @event
 */
export class ReplayFileChangeEvent {
	private _changeType;
	private _file;

	/** @internal */
	constructor (file : ReplayFile, change : ReplayFileChangeType) {
		this._file = file;
		this._changeType = change;
	}

	/**
	 * Indicates what content changed in the file.
	 */
	get changeType () { return this._changeType; }

	/**
	 * The file that was changed.
	 */
	get file () { return this._file; }
}
