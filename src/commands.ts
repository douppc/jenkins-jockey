/* global URL */
import {Build, Job, JobItem, model, Server} from './model';
import {
	env, ExtensionContext, QuickPickItem, SecretStorage, TreeItem, Uri, commands as vsc, window, workspace
} from 'vscode';
import {replay, ReplayFile} from './replay';
import {config} from './config';
import {JobObjectType} from './service';
import {JobTreeItem} from './jobtree';
import {ReplayTreeItem} from './replay/replaytreeitem';
import {UnknownItem} from './model/unknownitem';

type Creds = { user: string, key : string };

let _initialized = false;
let _secretStorage : SecretStorage | undefined = undefined;

async function getApiCreds (url : URL) : Promise<Creds | undefined> {
	if (!_secretStorage) throw Error('secret storage not set');
	const user = await _secretStorage.get(`user@${url.host}`);
	const key = await _secretStorage.get(`key@${url.host}`);
	if (user && key) {
		return {
			key,
			user
		};
	}
	return undefined;
}

async function saveApiCreds (url : URL, creds: Creds) : Promise<void> {
	if (!_secretStorage) throw Error('secret storage not set');
	if (creds.key && creds.user) {
		await _secretStorage.store(`user@${url.host}`, creds.user);
		await _secretStorage.store(`key@${url.host}`, creds.key);
	}
}
async function askForCreds (url : URL) : Promise<Creds | undefined> {
	const username = await window.showInputBox({
		'ignoreFocusOut': true,
		'prompt': `Enter the username to use for the URL ${url}`,
		'title': 'Jenkins Username'
	});
	if (!username) return undefined;
	const apiKey = await window.showInputBox({
		'ignoreFocusOut': true,
		'prompt': `Enter the API key to use for the URL ${url}. This can be easily created ` +
			`at (usually) ${url.host}/me/configure under "API Token".`,
		'title': 'Jenkins API Key'
	});
	if (!apiKey) return undefined;
	return {
		'key': apiKey,
		'user': username
	};
}

class ServerPickItem implements QuickPickItem {
	private _server;
	constructor (server : Server) {
		this._server = server;
	}

	get label () { return this._server.label; }
	get server () { return this._server; }
}
async function quickPickServer () : Promise<Server | undefined> {
	const items = model.servers.servers.map(s => new ServerPickItem(s));
	return (await window.showQuickPick(items))?.server;
}
async function urlFromServerInput (server : TreeItem | Server | URL | undefined) : Promise<URL | undefined> {
	if (server instanceof URL) return server;
	else if (server instanceof TreeItem) {
		return server.resourceUri ? new URL(server.resourceUri?.toString()) : undefined;
	} else if (server instanceof Server) return server.url;
	const userServer = await quickPickServer();
	if (userServer) return userServer.url;
	return undefined;
}
async function refreshInvalidParents () {
	const parents : {[k: string] : JobItem} = {};
	model.servers.getAllChildren(JobObjectType.invalid).forEach(c => {
		if (c.parent) parents[c.parent.url.toString()] = c.parent;
	});
	const proms : Promise<void>[] = [];
	for (const k in parents) {
		if (Object.hasOwnProperty.call(parents, k)) proms.push(parents[k].refreshData());
	}
	await Promise.all(proms);
}

/**
 * Namespace containing the available commands that can be executed.
 *
 * @remarks
 * This namespace contains all of the [functions](#functions) implementing commands in Jenkins Jockey. Each of
 * the functions in this namespace is a command and may be executed either directly:
 * ```ts
 * import {extensions} from 'vscode';
 *
 * const jenkinsJockey = extensions.getExtension('doupp.jenkins-jockey').exports;
 * let url = new URL('https://jenkins.mydomain.com');
 * jenkinsJockey.commands.connectServer();
 * ```
 * or indirectly like any other command in Visual Studio Code via the [commands
 * API](https://code.visualstudio.com/api/references/commands):
 * ```ts
 * import {commands} from 'vscode';
 *
 * let url = new URL('https://jenkins.mydomain.com');
 * let success = await commands.excuteCommand('jenkins-jockey.connectServer', url);
 * ```
 *
 * @public
 */
export namespace commands {

	/**
	 * Adds a new connection to a Jenkins server.
	 *
	 * @remarks
	 * This command will prompt for a URL and will add the connection to the server at the given URL to the
	 * configuration for Jenkins Jockey.
	 *
	 * @param urlIn - The URL for the new Jenkins server connection. If this is omitted, the user is prompted
	 * for it.
	 */
	export async function connectServer (urlIn : URL | undefined) {
		let url : URL | undefined = undefined;
		if (!urlIn) {
			const urlStr = await window.showInputBox({
				'ignoreFocusOut': true,
				'prompt': 'Enter the URL to the Jenkins server (e.g. https://jenkins.mydomain.com/',
				'title': 'Jenkins Server URL'
			});
			if (urlStr) {
				try {
					url = new URL(urlStr);
				} catch (e) {
					throw Error(`'${urlStr}' is not a valid URL`);
				}
			}
		}
		if (url) {
			await config.addServer(url);
			let creds = await getApiCreds(url);
			if (!creds) {
				creds = await askForCreds(url);
				if (creds) {
					await saveApiCreds(url, creds);
				}
			}
			if (!creds) {
				window.showWarningMessage(`No credentials supplied for server '${url.hostname}'. Run the ` +
					'\'Set Credentials\' command (right-click on the server) to resolve this issue.');
			}
		}
	}

	/**
	 * Disconnects from a Jenkins server.
	 * @param server - The server to be disconnected. This can be either the tree item, the data model
	 * object (a Server instance) representing the Jenkins server to disconnect, or the URL of the server to
	 * disconnect. If the nothing is supplied, a quick pick menu will display the list of servers so it can be
	 * chosen by the user.
	 */
	export async function disconnectServer (server : TreeItem | Server | URL | undefined) {
		const url = await urlFromServerInput(server);
		if (url) await config.removeServer(url);
	}

	/**
	 * Updates credentials for a Jenkins server.
	 * @param server - The server for which to set the credentials. This can be either the tree item or the
	 * data model object (a Server instance) representing the Jenkins server to set the credentials for. If
	 * the server is not supplied, a quick pick menu will display the list of servers so it can be chosen.
	 */
	export async function setServerCredentials (server : TreeItem | Server | URL | undefined) {
		const url = await urlFromServerInput(server);
		if (url) {
			const creds = await askForCreds(url);
			if (creds) await saveApiCreds(url, creds);
		}
	}

	/**
	 * Command to rename a Jenkins server.
	 * @param server - The server to rename. This may be the tree item for the server, the data model object
	 * ({@link Server}) for the server, or the URL of the server. If undefined, a quick pick is displayed so
	 * the user can select from the list of all servers. It is preferred to supply an actual server or tree
	 * item here if no name is given so the user can see what the hold label was.
	 * @param name - The new name for the server. If this is undefined, the user is prompted for the new name.
	 */
	export async function renameServer (server : TreeItem | Server | URL | undefined,
		name : string | undefined) {
		const url = await urlFromServerInput(server);
		if (!url) return;
		let text : string | undefined = undefined;
		if (name) text = name;
		else {
			let oldText : string | undefined = undefined;
			if (server instanceof TreeItem) oldText = server.label?.toString();
			else if (server instanceof Server) oldText = server.label;
			text = await window.showInputBox({
				'ignoreFocusOut': true,
				'prompt': `Enter the new name for the Jenkins server at ${url.hostname}`,
				'title': 'Jenkins Server Name',
				'value': oldText
			});
		}
		if (text) await config.renameServer(url, text);
	}

	/**
	 * Command to refresh a job item in the tree.
	 * @param item The job item to refresh. This may be the tree item for the job item to refresh or the job
	 * item itself.
	 */
	export async function refreshJob (item : JobTreeItem | JobItem) {
		let jobItem : JobItem | undefined = undefined;
		if (item instanceof JobTreeItem) jobItem = item.jobItem;
		else jobItem = item;
		await jobItem.refreshData();
	}

	/**
	 * Command to open a job in a browser.
	 * @param item  The job item to be opened in an external web browser. This may be the tree item for the
	 * job item to refresh or the job item itself.
	 */
	export async function openJobInBrowser (item : JobTreeItem | JobItem) {
		let jobItem : JobItem | undefined = undefined;
		if (item instanceof JobTreeItem) jobItem = item.jobItem;
		else jobItem = item;
		await env.openExternal(Uri.parse(jobItem.url.toString()));
	}

	/**
	 * Command to register an unknown job item's class as a job container.
	 * @remarks
	 * This command goes along with the class to job object type mapping described in {@link JobObjectType}.
	 * @param item The unknown job item whose class is to be registered as an extra class for a job container.
	 * This may be the tree item or the job object itself.
	 */
	export async function registerAsJobContainer (item : JobTreeItem | UnknownItem) {
		let ukItem : UnknownItem | undefined = undefined;
		if (item instanceof JobTreeItem && item.jobItem instanceof UnknownItem) ukItem = item.jobItem;
		else if (item instanceof UnknownItem) ukItem = item;
		if (ukItem) {
			await config.addExtraJobContainerClass(ukItem.className);
			await refreshInvalidParents();
		}
	}

	/**
	 * Command to register an unknown job item's class as a job.
	 * @remarks
	 * This command goes along with the class to job object type mapping described in {@link JobObjectType}.
	 * @param item The unknown job item whose class is to be registered as an extra class for a job. This may
	 * be the tree item or the job object itself.
	 */
	export async function registerAsJob (item : JobTreeItem | UnknownItem) {
		let ukItem : UnknownItem | undefined = undefined;
		if (item instanceof JobTreeItem && item.jobItem instanceof UnknownItem) ukItem = item.jobItem;
		else if (item instanceof UnknownItem) ukItem = item;
		if (ukItem) {
			await config.addExtraJobClass(ukItem.className);
			await refreshInvalidParents();
		}
	}

	/**
	 * Command to show a build log.
	 * @param item The job tree item or build to show the log for.
	 */
	export async function showBuildLog (item : JobTreeItem | Build) {
		let build : Build | undefined = undefined;
		if (item instanceof JobTreeItem && item.jobItem instanceof Build) build = item.jobItem;
		else if (item instanceof Build) build = item;
		if (build) {
			let urlStr = build.url.toString().replace('http', 'jjbuildlog');
			urlStr = urlStr.substring(0, urlStr.length - 1);
			urlStr += '-buildlog.txt';
			await window.showTextDocument(Uri.parse(urlStr));
		}
	}

	/**
	 * Command to show the JSON for the given build object.
	 * @param item The job tree item or job item to show the JSON for.
	 */
	export async function showJson (item : JobTreeItem | JobItem) {
		let i : JobItem | undefined = undefined;
		if (item instanceof JobTreeItem) i = item.jobItem;
		else if (item instanceof JobItem) i = item;
		if (i) {
			let urlStr = i.url.toString().replace('http', 'jjapijson');
			urlStr = urlStr.substring(0, urlStr.length - 1);
			urlStr += '-api-response.json';
			await window.showTextDocument(Uri.parse(urlStr));
		}
	}

	/**
	 * Activates replay for a given job or build.
	 * @param item The job tree item, build, or job to be set as active in the replay environment. If this is
	 * a job or the tree item for a job, the latest build in that job is the one used for the replay.
	 */
	export async function activateReplay (item : JobTreeItem | Build | Job) {
		await window.withProgress({'location': {'viewId': 'jenkinsJockeyReplayTree'}}, async () => {
			let i : JobItem | undefined = undefined;
			if (item instanceof JobTreeItem) i = item.jobItem;
			else if (item instanceof JobItem) i = item;
			let build : Build | undefined = undefined;
			if (i instanceof Job) build = i.children[0] as Build;
			else if (i instanceof Build) build = i;
			if (build) await replay.activate(build);
		});
	}

	/**
	 * Starts a replay for the active replay build.
	 */
	export async function runReplay () {
		await window.withProgress({'location': {'viewId': 'jenkinsJockeyReplayTree'}}, async () => {
			await replay.run();
		});
	}

	/**
	 * Sets the hideDisabled configuration option to true.
	 */
	export async function hideDisabled () {
		await config.setHideDisabled(true);
	}

	/**
	 * Sets the hideDisabled configuration to false.
	 */
	export async function showDisabled () {
		await config.setHideDisabled(false);
	}

	/**
	 * Shows a diff between a replay file's current content and its original content.
	 * @param item The tree item or replay file for which to show the diff.
	 */
	export async function showReplayDiff (item : ReplayTreeItem | ReplayFile) {
		const file = item instanceof ReplayFile ? item : item.file;
		await vsc.executeCommand('vscode.diff', file.origUri, file.uri,
			'Replay original (left) vs modified (right)');
	}

	/**
	 * Opens the file in the workspace that has the same filename as a replay file.
	 * @param item The tree item or replay file for which to show the workspace file.
	 */
	export async function openReplayWorkspaceFile (item : ReplayTreeItem | ReplayFile) {
		const file = item instanceof ReplayFile ? item : item.file;
		const found = await workspace.findFiles(`**/vars/${file.fileName}`);
		if (found.length > 0) await vsc.executeCommand('vscode.open', found[0]);
		else window.showErrorMessage(`'vars/${file.fileName}' was not found in the workspace`);
	}

	/**
	 * Shows a diff between a replay file's current content and the corresponding workspace file, if any.
	 * @param item The tree item or replay file for which to show the diff.
	 */
	export async function showReplayWorkspaceDiff (item : ReplayTreeItem | ReplayFile) {
		const file = item instanceof ReplayFile ? item : item.file;
		const found = await workspace.findFiles(`**/vars/${file.fileName}`);
		if (found.length > 0) {
			await vsc.executeCommand('vscode.diff', file.uri, found[0], 'Workspace (left) vs Replay (right)');
		} else window.showErrorMessage(`'vars/${file.fileName}' was not found in the workspace`);
	}

}

/** @internal */
export function initialize (context : ExtensionContext) {
	if (_initialized) return;
	_initialized = true;
	Object.keys(commands).forEach(cmd => {
		context.subscriptions.push(
			vsc.registerCommand(`jenkins-jockey.${cmd}`, commands[cmd as keyof typeof commands]));
	});
	_secretStorage = context.secrets;
}
