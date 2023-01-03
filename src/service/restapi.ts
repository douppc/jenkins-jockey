/* eslint-disable @typescript-eslint/no-explicit-any */
/* global URL */
import {ExtensionContext, SecretStorage} from 'vscode';
import axios from 'axios';
import {BuildData} from './builddata';
import {IncrementalLogData} from './incrementallogdata';
import {JobContainerData} from './jobcontainerdata';
import {JobData} from './jobdata';
import {parse} from 'node-html-parser';
import qs = require('qs');
import {ReplayFileData} from './replayfiledata';
import {ServerData} from './serverdata';

type Creds = { user: string, key : string };

let _secretStorage : SecretStorage | undefined = undefined;
let _initialized = false;

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

/**
 * The API for querying a Jenkins server.
 */
export class RestApi {

	/**
	 * Retrieves the common options for GET queries for a URL using axios.
	 * @param url The URL for which to retrieve the axios options.
	 * @returns A promise for an object containing the axios options.
	 */
	static async getRequestOptions (url : URL) : Promise<any> {
		const creds = await getApiCreds(url);
		if (!creds) throw Error(`No credentials saved for server at url ${url.host}`);
		return {
			'auth': {
				'password': creds.key,
				'username': creds.user
			},
			url
		};
	}

	/**
	 * Executes a GET request for a given URL.
	 * @param url The URL for which to perform the request.
	 * @returns The data from the repsonse. This is an unknown type and needs to be checked.
	 */
	static async getAny (url : URL) {
		const apiUrl = new URL(url.toString());
		apiUrl.pathname += 'api/json';
		const options = await this.getRequestOptions(apiUrl);
		const res = await axios(options);
		return res.data;
	}

	/**
	 * Retrieves the data for a server from the API endpoint for it.
	 * @param url The URL for the server.
	 * @returns The data created from the response from the Jenkins API.
	 */
	static async getServer (url : URL) : Promise<ServerData> {
		return new ServerData(await this.getAny(url));
	}

	/**
	 * Retrieves the data for a job container from the API endpoint for it.
	 * @param url The URL for the job container.
	 * @returns The data created from the response from the Jenkins API.
	 */
	static async getJobContainer (url : URL) : Promise<JobContainerData> {
		return new JobContainerData(await this.getAny(url));
	}

	/**
	 * Retrieves the data for a job from the API endpoint for it.
	 * @param url The URL for the job to retrieve.
	 * @returns The data created from the response from the Jenkins API.
	 */
	static async getJob (url : URL) : Promise<JobData> {
		return new JobData(await this.getAny(url));
	}

	/**
	 * Retrieves the data for a build from the API endpoint for it.
	 * @param url The URL of the build to retrieve.
	 * @returns The data created from the response from the Jenkins API.
	 */
	static async getBuild (url : URL) : Promise<BuildData> {
		return new BuildData(await this.getAny(url));
	}

	/**
	 * Retrieves the replay files for a given build.
	 * @param url The URL of the build for which to retrieve the replay files.
	 * @returns A list of file data for each file provided as replay by the build. This only includes files
	 *   actually used during the build.
	 */
	static async getBuildReplayFiles (urlIn : URL) : Promise<ReplayFileData[]> {
		const url = new URL(urlIn.toString());
		url.pathname += 'replay';
		const options = await this.getRequestOptions(url);
		options.responseType = 'document';
		const res = await axios(options);
		const files: ReplayFileData[] = [];
		const root = parse(res.data);
		root.querySelectorAll('div.jenkins-form-item').forEach(formItem => {
			const label = formItem.querySelector('div.jenkins-form-label');
			if (!label) throw Error('Could not find label for form text area');
			const textAreas = formItem.getElementsByTagName('textarea');
			if (textAreas.length !== 1) throw Error('Found an unexpected number of text areas');
			if (!('name' in textAreas[0].attributes)) throw Error('\'name\' property missing on text area');
			files.push(new ReplayFileData(textAreas[0].text, textAreas[0].attributes.name,
				label.text));
		});
		return files;
	}

	/**
	 * Retrieves the entirety of the build log without any polling.
	 * @param urlIn The build for which to retrieve the log.
	 * @returns The entire contents of the build log as a single string.
	 */
	static async getBuildLog (urlIn : URL) : Promise<string> {
		const url = new URL(urlIn.toString());
		url.pathname += 'consoleText';
		const options = await this.getRequestOptions(url);
		options.responseType = 'document';
		return (await axios(options)).data;
	}

	/**
	 * Retrieves an incremental chunk of log data for a build.
	 * @param urlIn The build for which to retrieve the log.
	 * @param pos The position at which to begin retrieving data.
	 * @returns The incremental log, including the position for the next chunk and whether there is still more
	 *   data.
	 */
	static async getIncrementalBuildLog (urlIn : URL, pos : number) : Promise<IncrementalLogData> {
		const url = new URL(urlIn.toString());
		url.pathname += 'logText/progressiveText';
		url.searchParams.append('start', pos.toString());
		const options = await this.getRequestOptions(url);
		const res = await axios(options);
		return new IncrementalLogData(res.data, res.headers['x-more-data'] === 'true',
			res.headers['x-text-size'] ? Number.parseInt(res.headers['x-text-size'], 10) : 0);
	}

	/**
	 * Replays a build with potentially modified files.
	 * @param urlIn The URL of the build to replay.
	 * @param files The contents of the files to be sent with the replay.
	 */
	static async replayBuild (urlIn : URL, files : ReplayFileData[]) : Promise<void> {
		const url = new URL(urlIn.toString());
		url.pathname += 'replay/run';
		const options = await this.getRequestOptions(url);
		const params : {[key : string] : string} = {};
		const json : {[key : string] : string} = {};
		files.forEach(file => {
			params[file.formName] = file.contents;
			json[file.formName.substring(2)] = file.contents;
		});
		params.json = JSON.stringify(json);
		params.Submit = 'Run';
		await axios({
			'auth': options.auth,
			'data': qs.stringify(params),
			'headers': {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			'method': 'post',
			'responseType': 'document',
			'url': url.toString()
		});
	}
}

export function initialize (context : ExtensionContext) {
	if (_initialized) return;
	_secretStorage = context.secrets;
	_initialized = true;
}
