import {FilePermission, FileStat, FileType, Uri} from 'vscode';
import {replay} from '.';
import {ReplayFile} from './replayfile';

export class ReplayFileStat implements FileStat {
	private _file;
	private _uri;
	private _ctime = Date.now();
	private _mtime = this._ctime;

	constructor (file : ReplayFile, uri : Uri) {
		this._file = file;
		this._uri = uri;
	}

	get type () { return FileType.File; }
	get ctime () { return this._ctime; }
	get mtime () { return this._mtime; }
	get size () { return this._file.content.length; }
	get permissions () {
		return this._uri.scheme === replay.origUriScheme ? FilePermission.Readonly : undefined;
	}
}
