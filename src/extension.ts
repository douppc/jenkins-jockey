import {ExtensionContext, languages, TreeViewOptions, window, workspace} from 'vscode';
import {replay, ReplayLogHandler} from './replay';
import {initialize as apiInit} from './service/restapi';
import {BuildLogContentProvider} from './textcontentprovider';
import {initialize as cmdInit} from './commands';
import {JobItem} from './model';
import {JobTreeDataProvider} from './jobtree';
import {ReplayFileSystemProvider} from './replay/replayfilesystem';
import {ReplayTreeProvider} from './replay/replaytree';

export function activate (context: ExtensionContext) {
	cmdInit(context);
	apiInit(context);
	const jobTreeProvider = new JobTreeDataProvider();
	const treeOptions : TreeViewOptions<JobItem> = {
		'showCollapseAll': true,
		'treeDataProvider': jobTreeProvider
	};
	context.subscriptions.push(jobTreeProvider);
	window.createTreeView('jenkinsJockeyJobTree', treeOptions);
	context.subscriptions.push(window.registerFileDecorationProvider(jobTreeProvider));
	const textProvider = new BuildLogContentProvider();
	textProvider.supportedSchemes.forEach(s => {
		context.subscriptions.push(workspace.registerTextDocumentContentProvider(s, textProvider));
		context.subscriptions.push(workspace.registerTextDocumentContentProvider(`${s}s`, textProvider));
	});
	context.subscriptions.push(window.registerTreeDataProvider('jenkinsJockeyReplayTree',
		new ReplayTreeProvider()));
	const replayFileProv = new ReplayFileSystemProvider();
	context.subscriptions.push(workspace.registerFileSystemProvider(replay.uriScheme, replayFileProv));
	context.subscriptions.push(workspace.registerFileSystemProvider(replay.origUriScheme, replayFileProv));
	const logHandler = new ReplayLogHandler();
	context.subscriptions.push(logHandler);
	context.subscriptions.push(languages.registerDocumentLinkProvider({'language': replay.logLangId},
		logHandler));
}

export function deactivate () {}
