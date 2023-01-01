import {ReplayFile} from './replayfile';

export class ReplayFilesEvent {
	private _addedFiles;
	private _removedFiles;
	constructor (addedFiles: ReplayFile[], removedFiles: ReplayFile[]) {
		this._addedFiles = addedFiles;
		this._removedFiles = removedFiles;
	}

	get addedFiles () { return this._addedFiles; }
	get removedFiles () { return this._removedFiles; }
}
