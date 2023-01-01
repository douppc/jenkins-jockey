/* global NodeJS, setTimeout, clearTimeout */
import {Build, Job, JobItemChangeEvent} from '../model';
import {commands, Disposable, EventEmitter} from 'vscode';
import {ReplayFileChangeEvent, ReplayFileChangeType} from './replayfilechangeevent';
import {ReplayFileData, RestApi} from '../service';
import {BuildStatus} from '../model/build';
import {ReplayFile} from './replayfile';
import {ReplayFilesEvent} from './replayfilesevent';

export {ReplayFile} from './replayfile';
export {ReplayFileChangeEvent, ReplayFileChangeType} from './replayfilechangeevent';
export {ReplayFilesEvent} from './replayfilesevent';
export {ReplayLogHandler} from './replayloghandler';

const _fileRefreshTime = 3000;

let _activeBuild : Build | undefined = undefined;
let _activeBuildSub : Disposable | undefined = undefined;
const _onDidChangeActive = new EventEmitter<Build | undefined>();
const _onDidChangeFiles = new EventEmitter<ReplayFilesEvent>();
let _files : {[k:string] :ReplayFile} = {};
let _buildRefreshTimer : NodeJS.Timer | undefined = undefined;
class ReplayFileImpl extends ReplayFile {
	updateData (data: ReplayFileData) {
		if (this._data.contents !== data.contents) {
			this._content = data.contents;
			this._data = data;
			this._onDidChangeContent.fire(new ReplayFileChangeEvent(this, ReplayFileChangeType.origContent));
			this._onDidChangeContent.fire(new ReplayFileChangeEvent(this, ReplayFileChangeType.content));
		}
	}
}

function buildChanged (c: JobItemChangeEvent) {
	if ((!c.changedProperties || c.changedProperties.includes('status')) && c.item instanceof Build &&
		c.item.status !== BuildStatus.building) {
		if (_buildRefreshTimer) clearTimeout(_buildRefreshTimer);
		replay.refreshFiles();
	}
}

/**
 * A namespace serving as the entry point for functionality having to do with the replay capability.
 */
export namespace replay {

	/**
	 * Retrieves the currently active replay build.
	 * @return The build that is currently active in the replay system.
	 */
	export function getActive () {
		return _activeBuild;
	}

	/**
	 * Activates a build for replay.
	 * This will supersede any existing active build and replace it with the given build. Any existing files
	 * will be abandoned and the new active build's files will be loaded.
	 * @param build The build to activate. If this is undefined, the replay system is disabled.
	 */
	export async function activate (build : Build | undefined) {
		if (_activeBuild === build) return;
		if (_activeBuildSub) {
			_activeBuildSub.dispose();
			_activeBuildSub = undefined;
		}
		_activeBuild = build;
		if (_activeBuild) {
			_activeBuild.onDidChangeData(buildChanged);
			if (_activeBuild.status === BuildStatus.invalid) await _activeBuild.expand();
		}
		await refreshFiles();
		commands.executeCommand('setContext', 'jenkins-jockey.replayActive', build !== undefined);
		_onDidChangeActive.fire(build);
	}

	/**
	 * Refreshes the files for the currently active replay build.
	 */
	export async function refreshFiles () {
		if (!_activeBuild) return;
		const files = await RestApi.getBuildReplayFiles(_activeBuild.url);
		const oldFiles = _files;
		const addedFiles : ReplayFile[] = [];
		_files = {};
		files.forEach(f => {
			if (f.formName in oldFiles) {
				const oldFile = oldFiles[f.formName];
				_files[f.formName] = oldFile;
				if (oldFile instanceof ReplayFileImpl) oldFile.updateData(f);
				else throw Error('old file not an impl');
				delete oldFiles[f.formName];
			} else {
				_files[f.formName] = new ReplayFileImpl(f);
				addedFiles.push(_files[f.formName]);
			}
		});
		if (_activeBuild.status === BuildStatus.building) {
			_buildRefreshTimer = setTimeout(refreshFiles, _fileRefreshTime);
		}
		_onDidChangeFiles.fire(new ReplayFilesEvent(addedFiles, Object.values(oldFiles)));
	}

	/**
	 * Starts replay for the currently active job.
	 */
	export async function run () {
		if (!_activeBuild || _activeBuild.status === BuildStatus.building) return;
		const job = _activeBuild.parent as Job;
		const fileData = Object.values(_files).map(f => f.data);
		await RestApi.replayBuild(_activeBuild.url, fileData);
		await job.refreshData();
		await activate(job.children[0] as Build);
	}

	/**
	 * Event fired when the active replay build changes.
	 * @eventProperty
	 */
	export const onDidChangeActive = _onDidChangeActive.event;

	/**
	 * Event fired when the list of replay files changes.
	 * @eventProperty
	 */
	export const onDidChangeFiles = _onDidChangeFiles.event;

	/**
	 * Retrieves the files retrieved for the active replay job.
	 */
	export function getFiles () {
		return Object.values(_files);
	}

	/**
	 * The URI scheme used by the replay system for file content.
	 */
	export const uriScheme = 'jjreplay';

	/**
	 * The URI scheme used by the replay system for original content of files.
	 */
	export const origUriScheme = 'jjreplayorig';

	/**
	 * The language ID for the log output.
	 */
	export const logLangId = 'jjreplaylog';
}
