/* global URL */
import {ConfigurationChangeEvent, window, workspace} from 'vscode';
import {config} from '../config';
import {JobItem} from './jobitem';
import {Server} from './server';

/**
 * Represents a list of Jenkins Server instances that Jenkins Jockey is connected to and displaying data for.
 * @public
 * @category Model
 */
export class Servers extends JobItem {

	/** @internal */
	constructor () {
		super(undefined);
		workspace.onDidChangeConfiguration(this.onConfigurationChanged, this);
		this.refreshData();
	}

	/** @internal */
	override async doRefreshData () : Promise<void> {
		const servers = config.getServers();
		const childByUrl : {[key : string] : JobItem} = {};
		this.children.forEach(c => {
			childByUrl[c.url.toString()] = c;
		});
		this.children = servers.map(s => (s.url in childByUrl ? childByUrl[s.url] : new Server(this, s)));
		this.notifyPropertyChange('children');
		await Promise.resolve();
	}

	private async onConfigurationChanged (evt : ConfigurationChangeEvent) {
		if (!evt.affectsConfiguration('jenkinsJockey')) return;
		try {
			await this.refreshData();
		} catch (e) {
			if (e instanceof Error) window.showErrorMessage(e.message);
		}
	}

	override get url () { return new URL('http://x.com'); }
	override get label () { return ''; }

	/**
	 * The list of all servers connected to by Jenkins Jockey.
	 */
	get servers () : Server[] { return this.children.map(c => c as Server); }
}
