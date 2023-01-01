import {FileStat, FileType} from 'vscode';

/**
 * A directory used by the ReplayFileSystem for the root.
 * @internal
 */
export class ReplayDirectory implements FileStat {
	type = FileType.Directory;
	ctime = Date.now();
	mtime = this.ctime;
	size = 0;
	name: string;
	constructor (name: string) { this.name = name; }
}
