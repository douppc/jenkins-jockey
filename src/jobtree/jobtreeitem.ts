import {Build, Job, JobContainer, JobItem, JobItemLoadState, Server, Servers} from '../model';
import {ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri} from 'vscode';
import {BuildStatus} from '../model/build';
import {UnknownItem} from '../model/unknownitem';

/**
 * A tree item representing a job item.
 */
export class JobTreeItem extends TreeItem {
	private _jobItem : JobItem;

	/** @internal */
	constructor (item : JobItem) {
		super(JobTreeItem.computeLabel(item),
			item instanceof Build ? TreeItemCollapsibleState.None : TreeItemCollapsibleState.Collapsed);
		this._jobItem = item;
		this.id = `${item.constructor.name}:${item.url.toString()}`;
		this.resourceUri = Uri.parse(item.url.toString());
		if (item instanceof Build) this.contextValue = 'build';
		else if (item instanceof Job) this.contextValue = 'job';
		else if (item instanceof JobContainer) this.contextValue = 'jobContainer';
		else if (item instanceof Server) this.contextValue = 'server';
		else if (item instanceof Servers) this.contextValue = 'servers';
		else this.contextValue = 'unknown';
		this.description = item.description ? item.description : '';
		if (item instanceof UnknownItem) {
			this.tooltip = 'This type of item is not recognized and therefore cannot be expanded or used ' +
				'with Jenkins Jockey. This can be corrected by identifying whether this is a Job or Job ' +
				'Container via commands in the right-click menu. Doing so will affect how Jenkins Jockey ' +
				'will interact with this object type. Your choice will be remembered and used for all ' +
				'future objects of this type. Please report this new type with a ticket on the ' +
				'extenstion\'s GitHub page so we can incorporate the proper type recognition by default.';
		} else if (item.loadState === JobItemLoadState.error) this.tooltip = item.lastError;
		let themeIcon = '';
		if (item.loadState === JobItemLoadState.loading) themeIcon = 'loading~spin';
		else if (item.loadState === JobItemLoadState.error) themeIcon = 'error';
		else if (item instanceof Build && item.status === BuildStatus.building) themeIcon = 'sync~spin';
		else if (item instanceof Server) themeIcon = 'server';
		else if (item instanceof JobContainer) themeIcon = 'server-environment';
		else if (item instanceof Job) themeIcon = 'server-process';
		else themeIcon = 'checklist';
		this.iconPath = new ThemeIcon(themeIcon);
	}

	/** @internal */
	private static computeLabel (item : JobItem) {
		let suffix = '';
		if (item instanceof Job) {
			if (!item.buildable) suffix = ' (disabled)';
			else if (item.children.length === 0) suffix = ' (not built)';
		} else if (item instanceof UnknownItem) suffix = ' (Unknown Type)';
		return item.label + suffix;
	}

	/**
	 * The associated job item.
	 */
	get jobItem () { return this._jobItem; }
}
