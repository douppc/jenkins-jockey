/* global NodeJS, clearTimeout, setTimeout */
import {
	Build, BuildStatus, Job, JobItem, JobItemChange, JobItemLoadState, JobStatus, model, Servers
} from '../model';
import {
	ConfigurationChangeEvent,
	Disposable,
	Event,
	EventEmitter,
	FileDecoration,
	FileDecorationProvider,
	ProviderResult,
	ThemeColor,
	TreeDataProvider,
	Uri,
	window,
	workspace
} from 'vscode';
import {Config} from '../config';
import {JobTreeItem} from './jobtreeitem';

// Min time between event fires from the tree.
const treeEmitBatchTime = 5;

/**
 * Tree data provider for the jobs view.
 * @public
 */
export class JobTreeDataProvider implements TreeDataProvider<JobItem>, Disposable, FileDecorationProvider {
	private _subscriptions : {[key: string] : Disposable} = {};
	private _itemsByUrl : {[k: string] : JobTreeItem} = {};
	private _treeChangeEmitter : EventEmitter<JobItem | JobItem[] | undefined> =
		new EventEmitter<JobItem | JobItem[] | undefined>();

	private _treeChangeBuffer : {[k:string]: JobItem } = {};
	private _treeChangeTimer? : NodeJS.Timer;
	private _onDidChangeFileDecorations : EventEmitter<Uri | Uri[] | undefined> =
		new EventEmitter<Uri | Uri[] | undefined>();

	private _hideDisabled = false;
	readonly onDidChangeTreeData: Event<JobItem | JobItem[] | undefined> = this._treeChangeEmitter.event;
	readonly onDidChangeFileDecorations: Event<Uri | Uri[] | undefined> | undefined =
		this._onDidChangeFileDecorations.event;

	constructor () {
		this._subscriptions[model.servers.id] = model.servers.onDidChangeData(this.jobItemChanged, this);
		this._subscriptions[''] = workspace.onDidChangeConfiguration(this.configurationChanged, this);
		this._hideDisabled = Config.hideDisabled();
	}

	getTreeItem (element: JobItem) : JobTreeItem {
		if (!(element.id in this._subscriptions)) {
			this._subscriptions[element.id] = element.onDidChangeData(this.jobItemChanged, this);
		}
		if (!element.expanded) {
			// Execute in the background. We don't need to wait on the expansion to finish.
			element.expand().catch(e => {
				if (e instanceof Error) window.showErrorMessage(e.message);
			});
		}
		const item = new JobTreeItem(element);
		this._itemsByUrl[item.jobItem.url.toString()] = item;
		return item;
	}

	getChildren (element?: JobItem) : JobItem[] {
		let items : JobItem[] = [];
		if (element) items = element.children;
		else {
			if (!model.servers.expanded) {
				// Execute in the background. We don't need to wait on the expansion to finish.
				model.servers.expand().catch(e => {
					if (e instanceof Error) window.showErrorMessage(e.message);
				});
			}
			items = model.servers.children;
		}
		if (Config.hideDisabled()) {
			return items.filter(i => !(i instanceof Job) || i.buildable ||
				i.loadState === JobItemLoadState.loading || i.loadState === JobItemLoadState.sparse);
		}
		return items;
	}

	private configurationChanged (e: ConfigurationChangeEvent) {
		if (!e.affectsConfiguration('jenkinsJockey') || Config.hideDisabled() === this._hideDisabled) return;
		this._treeChangeEmitter.fire(model.servers.getAllChildren().filter(
			p => p.children.some(c => c instanceof Job && !c.buildable)
		));
	}

	private jobItemChanged (c: JobItemChange) {
		if (c.changedProperties && c.changedProperties.includes('buildable') && this._hideDisabled &&
				c.item.parent) {
			this.fireTreeChange(c.item.parent);
		}
		if (c.item instanceof Servers) this._treeChangeEmitter.fire(undefined);
		else this.fireTreeChange(c.item);
		this._onDidChangeFileDecorations.fire(Uri.parse(c.item.url.toString()));
	}

	dispose () {
		for (const u in this._subscriptions) {
			if (Object.prototype.hasOwnProperty.call(this._subscriptions, u)) {
				this._subscriptions[u].dispose();
			}
		}
	}

	provideFileDecoration (uri: Uri): ProviderResult<FileDecoration> {
		if (!(uri.toString() in this._itemsByUrl)) return null;
		const item = this._itemsByUrl[uri.toString()].jobItem;
		if (item instanceof Job) {
			if (!item.buildable) {
				return new FileDecoration('D', 'job is disabled', new ThemeColor('disabledForeground'));
			} else if (item.status === JobStatus.aborted) {
				return new FileDecoration('A', 'job was aborted',
					new ThemeColor('list.deemphasizedForeground'));
			} else if (item.status === JobStatus.notbuilt) {
				return new FileDecoration('N', 'job has not been built',
					new ThemeColor('list.deemphasizedForeground'));
			} else if (item.status === JobStatus.failed) {
				return new FileDecoration('F', 'job has recently failed',
					new ThemeColor('list.errorForeground'));
			} else if (item.status === JobStatus.unstable) {
				return new FileDecoration('U', 'job has been unstable',
					new ThemeColor('list.warningForeground'));
			}
		} else if (item instanceof Build) {
			if (item.status === BuildStatus.building) {
				return new FileDecoration('B', 'build is still building',
					new ThemeColor('list.highlightForeground'));
			} else if (item.status === BuildStatus.failed) {
				return new FileDecoration('F', 'build failed',
					new ThemeColor('list.errorForeground'));
			} else if (item.status === BuildStatus.aborted) {
				return new FileDecoration('A', 'build was aborted',
					new ThemeColor('list.deemphasizedForeground'));
			} else if (item.status === BuildStatus.unstable) {
				return new FileDecoration('U', 'build is unstable', new ThemeColor('list.warningForeground'));
			}
		}
		return null;
	}

	private fireTreeChange (item : JobItem) {
		this._treeChangeBuffer[item.id] = item;
		if (this._treeChangeTimer) clearTimeout(this._treeChangeTimer);
		this._treeChangeTimer = setTimeout(() => {
			this._treeChangeEmitter.fire(Object.values(this._treeChangeBuffer));
		}, treeEmitBatchTime);
	}
}
