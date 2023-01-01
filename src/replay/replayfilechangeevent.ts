import {ReplayFile} from './replayfile';

export enum ReplayFileChangeType {
	content,
	origContent
}

export class ReplayFileChangeEvent {
	private _changeType;
	private _file;
	constructor (file : ReplayFile, change : ReplayFileChangeType) {
		this._file = file;
		this._changeType = change;
	}

	get changeType () { return this._changeType; }
	get file () { return this._file; }
}
