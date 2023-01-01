/* global URL */
import {TextDocumentContentProvider, Uri} from 'vscode';
import {RestApi} from './service';


const schemes : {[k:string] : (uri: Uri) => Promise<string>} = {
	'jjapijson': async (uri: Uri) => JSON.stringify(await RestApi.getAny(new URL(uri.toString().
		replace('jjapijson', 'http').
		replace('-api-response.json', '/'))), undefined, '  '),
	'jjbuildlog': async (uri: Uri) => await RestApi.getBuildLog(new URL(uri.toString().
		replace('jjbuildlog', 'http').
		replace('-buildlog.txt', '/')))
};

export class BuildLogContentProvider implements TextDocumentContentProvider {
	async provideTextDocumentContent (uri: Uri): Promise<string> {
		const sch = Object.keys(schemes).find(s => uri.scheme.startsWith(s));
		if (sch) return await schemes[sch](uri);
		return '';
	}

	get supportedSchemes () {
		return Object.keys(schemes);
	}
}
