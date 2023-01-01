/* global URL */
import {BuildListingData, JobListingData, JobObjectType, RestApi, ServerData} from '../service';
import {config, ServerConfig} from '../config';
import {ConfigurationChangeEvent, workspace} from 'vscode';
import {Job} from './job';
import {JobContainer} from './jobcontainer';
import {JobContainerBase} from './jobcontainerbase';
import {JobItem} from './jobitem';
import {UnknownItem} from './unknownitem';

/**
 * Class represents a Jenkins server.
 * @public
 * @category Model
 */
export class Server extends JobContainerBase {
	private _data : ServerData | undefined = undefined;
	private _config : ServerConfig;

	/** @internal */
	constructor (parent: JobItem, cfg: ServerConfig) {
		super(parent);
		this._config = cfg;
		workspace.onDidChangeConfiguration(this.onConfigurationChanged, this);
	}

	override get url () { return new URL(this._config.url); }
	override get label () { return this._config.label; }
	override get description () { return this._data ? this._data.description : ''; }
	override get objectType () { return JobObjectType.server; }


	/** @internal */
	onConfigurationChanged (e : ConfigurationChangeEvent) {
		if (!e.affectsConfiguration('jenkinsJockey')) return;
		const servers = config.getServers();
		const server = servers.find(s => s.url === this.url.hostname);
		if (server) {
			const oldData = this._config;
			this._config = server;
			this.compareAndNotify(server, oldData, {'label': 'label'});
		}
	}

	/** @internal */
	override async doRefreshData (): Promise<void> {
		const data = await RestApi.getServer(this.url);
		const oldData = this._data;
		this._data = data;
		if (!oldData || data.description !== oldData.description) this.notifyPropertyChange('description');
		this.updateChildren(data.jobs);
	}


	/** @internal */
	override createChild (listing : JobListingData | BuildListingData) : JobItem {
		if (listing instanceof JobListingData) {
			if (listing.type === JobObjectType.job) return new Job(this, listing);
			else if (listing.type === JobObjectType.jobContainer) return new JobContainer(this, listing);
			else if (listing.type === JobObjectType.invalid) return new UnknownItem(this, listing);
		}
		throw Error('Invalid listing type');
	}
}
