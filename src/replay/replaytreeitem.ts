import {ReplayFile} from './replayfile';
import {TreeItem} from 'vscode';

export class ReplayTreeItem extends TreeItem {
	private _file;
	constructor (file : ReplayFile) {
		super(file.label === 'Main Script' ? file.label : file.fileName);
		this.id = file.fileName;
		this.label = file.label === 'Main Script' ? file.label : file.fileName;
		this.resourceUri = file.uri;
		this.command = {
			'arguments': [file.uri],
			'command': 'vscode.open',
			'title': 'Open'
		};
		this._file = file;
	}

	get file () { return this._file; }
}
