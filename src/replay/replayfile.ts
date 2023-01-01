import {EventEmitter, Uri} from 'vscode';
import {ReplayFileChangeEvent, ReplayFileChangeType} from './replayfilechangeevent';
import {replay} from '.';
import {ReplayFileData} from '../service';

/**
 * A file included in a job replay.
 *
 * @remarks
 * These files can be retrieved from {@link replay.getFiles} and represent each of the files that can be
 * modified when running the replay for the active build.
 *
 * Each `ReplayFile` is effectively two files:
 * - current content: a file is provided at the URI provided by the {@link ReplayFile.uri} property that
 *   represents the current content of the file that will be submitted when the next replay is triggered.
 * - original content: a file is preovided at the URI provided by the {@link ReplayFile.origUri} property that
 *   represents the original content of the file from the previous build.
 *
 * These URIs can then be used to view the respective content, view diffs, etc.
 * @category Replay
 */
export class ReplayFile {

	/** @internal */
	protected _data;

	/** @internal */
	protected _content;

	/** @internal */
	protected _onDidChangeContent = new EventEmitter<ReplayFileChangeEvent>();

	/** @internal */
	constructor (data : ReplayFileData) {
		this._data = data;
		this._content = data.contents;
	}

	/**
	 * The representation of the file retrieved from the API.
	 */
	get data () { return this._data; }

	/**
	 * The name of the file with the appropriate extension (<whatever>.groovy).
	 */
	get fileName () {
		// eslint-disable-next-line no-magic-numbers
		return `${this._data.formName.substring(2)}.groovy`;
	}

	/**
	 * The label used to display the file in the tree, if relevant.
	 */
	get label () { return this._data.label; }

	/**
	 * The current content of the file.
	 */
	get content () { return this._content; }
	set content (c : string) {
		if (c !== this._content) {
			this._content = c;
			this._onDidChangeContent.fire(new ReplayFileChangeEvent(this, ReplayFileChangeType.content));
		}
	}

	/**
	 * The content of the file from the previous build.
	 */
	get originalContent () { return this._data.contents; }

	/**
	 * The URI that can be used access the curent contents of the file.
	 */
	get uri () {
		return Uri.from({
			'path': `/${this.fileName}`,
			'scheme': replay.uriScheme
		});
	}

	/**
	 * The URI that can be used to access the contents of the file from the previous build.
	 */
	get origUri () {
		return Uri.from({
			'path': `/${this.fileName}`,
			'scheme': replay.origUriScheme
		});
	}

	/**
	 * Reverts the current content of the file back to the original content from the previous build.
	 */
	public revert () {
		if (this.content !== this._data.contents) {
			this._content = this._data.contents;
			this._onDidChangeContent.fire(new ReplayFileChangeEvent(this, ReplayFileChangeType.content));
		}
	}

	/**
	 * Event fired when the content or original content of this file changes.
	 * @eventProperty
	 */
	public onDidChangeContent = this._onDidChangeContent.event;
}
