import {EventEmitter, ProviderResult, TreeDataProvider, TreeItem} from 'vscode';
import {replay} from '.';
import {ReplayFile} from './replayfile';
import {ReplayTreeItem} from './replaytreeitem';

export class ReplayTreeProvider implements TreeDataProvider<ReplayFile> {
	private _onDidChangeTreedata : EventEmitter<ReplayFile | undefined | void> =
		new EventEmitter<ReplayFile | undefined | void>();

	constructor () {
		replay.onDidChangeFiles(this.filesChanged, this);
	}

	onDidChangeTreeData = this._onDidChangeTreedata.event;
	getTreeItem (element: ReplayFile): TreeItem {
		return new ReplayTreeItem(element);
	}

	getChildren (element?: ReplayFile | undefined): ProviderResult<ReplayFile[]> {
		if (!element) return replay.getFiles();
		return [];
	}

	private filesChanged () {
		this._onDidChangeTreedata.fire();
	}
}
