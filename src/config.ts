/* global URL */
import {workspace} from 'vscode';

/**
 * A server entry in the configuration.
 */
export type ServerConfig = {

	/**
	 * The URL for the server.
	 * This should be URL.host when calling this API to get consistent matches.
	 */
	url : string;

	/**
	 * The label shown for the server in the UI.
	 */
	label : string;
};

/**
 * Provides access to Jenkins Jockey configuration.
 */
export class Config {

	/**
	 * Adds a new jenkins server to Jenkins Jockey's job listing.
	 * @param url The server's URL as a string.
	 */
	static async addServer (url : URL) {
		const config = workspace.getConfiguration('jenkinsJockey');
		let servers : ServerConfig[] = [];
		servers = config.get('servers', servers);

		// Check to see if the server is already defined.
		if (servers.some(server => server.url === url.toString())) {
			throw Error(`Server at URL '${url.toString()}' already added`);
		}
		servers.push({
			'label': url.hostname,
			'url': url.origin
		});
		await config.update('servers', servers, true);
	}

	/**
	 * Retrieves the list of servers from the configuration.
	 * @return The servers that have been added to the configuration.
	 */
	static getServers () : ServerConfig[] {
		const config = workspace.getConfiguration('jenkinsJockey');
		return config.get('servers', []);
	}

	/**
	 * Removes a server from the Jenkins Jockey job list.
	 * @param url The URL for the server to remove.
	 */
	static async removeServer (url : URL) {
		const config = workspace.getConfiguration('jenkinsJockey');
		let servers : ServerConfig[] = [];
		servers = config.get('servers', []);
		const newServers = servers.filter(server => server.url !== url.hostname);
		if (newServers.length !== servers.length) await config.update('servers', newServers, true);
	}

	/**
	 * Renames a server for display in the job browser.
	 * @param urlStr The URL for the server to rename.
	 * @param newName The new name for the server.
	 */
	static async renameServer (url : URL, newName : string) {
		const config = workspace.getConfiguration('jenkinsJockey');
		let servers : ServerConfig[] = [];
		servers = config.get('servers', servers);
		let change = false;
		servers.forEach(server => {
			if (server.url === url.hostname && server.label !== newName) {
				server.label = newName;
				change = true;
			}
		});
		if (change) await config.update('servers', servers);
	}

	/**
	 * Retrieves the list of extra job class names.
	 * @returns The list of job class names that will be searched in addition to the built-in list of classes
	 * to identify which classes to consider as jobs when expanding job listings. See the remarks on
	 * {@link JobObjectType} for more details on what these class names are used for.
	 */
	static getExtraJobClasses () : string[] {
		const config = workspace.getConfiguration('jenkinsJockey');
		return config.get('extraJobClasses', []);
	}

	/**
	 * Adds a class to the list of extra job class names.
	 * @param className The new class name to be considered a job. See the remarks on {@link JobObjectType}
	 * for more details on what these class names are used for. If this class name was previously registered
	 * as a job container class, it is removed from that list. If it was already in this list, this function
	 * does nothing.
	 */
	static async addExtraJobClass (className : string) {
		const config = workspace.getConfiguration('jenkinsJockey');
		await this.removeExtraJobContainerClass(className);
		let jobs : string[] = [];
		jobs = config.get('extraJobClasses', jobs);
		if (!jobs.includes(className)) {
			jobs.push(className);
			await config.update('extraJobClasses', jobs, true);
		}
	}

	/**
	 * Removes a class from the list of extra job class names.
	 * @param className The class name to no longer consider a job. See the remarks on {@link JobObjectType}
	 * for more details on what these class names are used for.
	 */
	static async removeExtraJobClass (className : string) {
		const config = workspace.getConfiguration('jenkinsJockey');
		let jobs : string[] = [];
		jobs = config.get('extraJobClasses', jobs);
		if (jobs.includes(className)) {
			jobs.filter(j => j !== className);
			await config.update('extraJobClasses', jobs, true);
		}
	}

	/**
	 * Retrieves the list of extra job container class names.
	 * @returns The list of job container class names that will be searched in addition to the built-in list
	 * of classes to identify which classes to consider as jobs when expanding job listings. This is
	 * ultimately used in the {@link JobListingData.type} property so that it expands properly.
	 */
	static getExtraJobContainerClasses () : string[] {
		const config = workspace.getConfiguration('jenkinsJockey');
		return config.get('extraJobContainerClasses', []);
	}

	/**
	 * Adds a class to the list of extra job container class names.
	 * @param className The new class name to be considered a job containre. See the remarks on
	 * {@link JobObjectType} for more details on what these class names are used for. If this class name was
	 * previously registered as a job class, it is removed from that list. If it was already in this list,
	 * this function does nothing.
	 */
	static async addExtraJobContainerClass (className : string) {
		const config = workspace.getConfiguration('jenkinsJockey');
		await this.removeExtraJobClass(className);
		let containers : string[] = [];
		containers = config.get('extraJobContainerClasses', containers);
		if (!containers.includes(className)) {
			containers.push(className);
			await config.update('extraJobContainerClasses', containers, true);
		}
	}

	/**
	 * Removes a class from the list of extra job container class names.
	 * @param className The class name to no longer consider a job container. See the remarks on
	 * {@link JobObjectType} for more details on what these class names are used for.
	 */
	static async removeExtraJobContainerClass (className : string) {
		const config = workspace.getConfiguration('jenkinsJockey');
		let containers : string[] = [];
		containers = config.get('extraJobContainerClasses', containers);
		if (containers.includes(className)) {
			containers.filter(c => c !== className);
			await config.update('extraJobContainerClasses', containers, true);
		}
	}

	/**
	 * Indicates whether or not to hide disabled jobs in the job tree.
	 * @returns true if disabled jobs are hidden, false otherwise.
	 */
	static hideDisabled () {
		return workspace.getConfiguration('jenkinsJockey').get('hideDisabled', false);
	}

	/**
	 * Sets whether disabled jobs are hidden in the job tree.
	 * @param hide - true if the disabled jobs will be hidden, false otherwise.
	 */
	static async setHideDisabled (hide : boolean) {
		await workspace.getConfiguration('jenkinsJockey').update('hideDisabled', hide, true);
	}
}
