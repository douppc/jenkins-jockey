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
export namespace config {

	/**
	 * Adds a new jenkins server to Jenkins Jockey's job listing.
	 * @param url The server's URL as a string.
	 */
	export async function addServer (url : URL) {
		const cfg = workspace.getConfiguration('jenkinsJockey');
		let servers : ServerConfig[] = [];
		servers = cfg.get('servers', servers);

		// Check to see if the server is already defined.
		if (servers.some(server => server.url === url.toString())) {
			throw Error(`Server at URL '${url.toString()}' already added`);
		}
		servers.push({
			'label': url.hostname,
			'url': url.origin
		});
		await cfg.update('servers', servers, true);
	}

	/**
	 * Retrieves the list of servers from the configuration.
	 * @return The servers that have been added to the configuration.
	 */
	export function getServers () : ServerConfig[] {
		const cfg = workspace.getConfiguration('jenkinsJockey');
		return cfg.get('servers', []);
	}

	/**
	 * Removes a server from the Jenkins Jockey job list.
	 * @param url The URL for the server to remove.
	 */
	export async function removeServer (url : URL) {
		const cfg = workspace.getConfiguration('jenkinsJockey');
		let servers : ServerConfig[] = [];
		servers = cfg.get('servers', []);
		const newServers = servers.filter(
			server => server.url !== url.origin && server.url !== url.toString());
		if (newServers.length !== servers.length) await cfg.update('servers', newServers, true);
	}

	/**
	 * Renames a server for display in the job browser.
	 * @param urlStr The URL for the server to rename.
	 * @param newName The new name for the server.
	 */
	export async function renameServer (url : URL, newName : string) {
		const cfg = workspace.getConfiguration('jenkinsJockey');
		let servers : ServerConfig[] = [];
		servers = cfg.get('servers', servers);
		let change = false;
		servers.forEach(server => {
			if ((server.url === url.origin || server.url === url.toString()) && server.label !== newName) {
				server.label = newName;
				change = true;
			}
		});
		if (change) await cfg.update('servers', servers, true);
	}

	/**
	 * Retrieves the list of extra job class names.
	 * @returns The list of job class names that will be searched in addition to the built-in list of classes
	 * to identify which classes to consider as jobs when expanding job listings. See the remarks on
	 * {@link JobObjectType} for more details on what these class names are used for.
	 */
	export function getExtraJobClasses () : string[] {
		const cfg = workspace.getConfiguration('jenkinsJockey');
		return cfg.get('extraJobClasses', []);
	}

	/**
	 * Adds a class to the list of extra job class names.
	 * @param className The new class name to be considered a job. See the remarks on {@link JobObjectType}
	 * for more details on what these class names are used for. If this class name was previously registered
	 * as a job container class, it is removed from that list. If it was already in this list, this function
	 * does nothing.
	 */
	export async function addExtraJobClass (className : string) {
		const cfg = workspace.getConfiguration('jenkinsJockey');
		await cfg.removeExtraJobContainerClass(className);
		let jobs : string[] = [];
		jobs = cfg.get('extraJobClasses', jobs);
		if (!jobs.includes(className)) {
			jobs.push(className);
			await cfg.update('extraJobClasses', jobs, true);
		}
	}

	/**
	 * Removes a class from the list of extra job class names.
	 * @param className The class name to no longer consider a job. See the remarks on {@link JobObjectType}
	 * for more details on what these class names are used for.
	 */
	export async function removeExtraJobClass (className : string) {
		const cfg = workspace.getConfiguration('jenkinsJockey');
		let jobs : string[] = [];
		jobs = cfg.get('extraJobClasses', jobs);
		if (jobs.includes(className)) {
			jobs.filter(j => j !== className);
			await cfg.update('extraJobClasses', jobs, true);
		}
	}

	/**
	 * Retrieves the list of extra job container class names.
	 * @returns The list of job container class names that will be searched in addition to the built-in list
	 * of classes to identify which classes to consider as jobs when expanding job listings. This is
	 * ultimately used in the {@link JobListingData.type} property so that it expands properly.
	 */
	export function getExtraJobContainerClasses () : string[] {
		const cfg = workspace.getConfiguration('jenkinsJockey');
		return cfg.get('extraJobContainerClasses', []);
	}

	/**
	 * Adds a class to the list of extra job container class names.
	 * @param className The new class name to be considered a job containre. See the remarks on
	 * {@link JobObjectType} for more details on what these class names are used for. If this class name was
	 * previously registered as a job class, it is removed from that list. If it was already in this list,
	 * this function does nothing.
	 */
	export async function addExtraJobContainerClass (className : string) {
		const cfg = workspace.getConfiguration('jenkinsJockey');
		await cfg.removeExtraJobClass(className);
		let containers : string[] = [];
		containers = cfg.get('extraJobContainerClasses', containers);
		if (!containers.includes(className)) {
			containers.push(className);
			await cfg.update('extraJobContainerClasses', containers, true);
		}
	}

	/**
	 * Removes a class from the list of extra job container class names.
	 * @param className The class name to no longer consider a job container. See the remarks on
	 * {@link JobObjectType} for more details on what these class names are used for.
	 */
	export async function removeExtraJobContainerClass (className : string) {
		const cfg = workspace.getConfiguration('jenkinsJockey');
		let containers : string[] = [];
		containers = cfg.get('extraJobContainerClasses', containers);
		if (containers.includes(className)) {
			containers.filter(c => c !== className);
			await cfg.update('extraJobContainerClasses', containers, true);
		}
	}

	/**
	 * Indicates whether or not to hide disabled jobs in the job tree.
	 * @returns true if disabled jobs are hidden, false otherwise.
	 */
	export function hideDisabled () {
		return workspace.getConfiguration('jenkinsJockey').get('hideDisabled', false);
	}

	/**
	 * Sets whether disabled jobs are hidden in the job tree.
	 * @param hide - true if the disabled jobs will be hidden, false otherwise.
	 */
	export async function setHideDisabled (hide : boolean) {
		await workspace.getConfiguration('jenkinsJockey').update('hideDisabled', hide, true);
	}
}
