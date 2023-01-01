/* eslint-disable @typescript-eslint/no-explicit-any */
/* global URL */
import {assertObject, getOptionalStringProperty} from './common';
import {JobListingData} from './joblistingdata';

/**
 * The data for a server supplied by the API endpoint.
 * @public
 * @sealed
 * @category API Response
 */
export class ServerData {
	private _data : any;

	/** @internal */
	constructor (data : any) {
		assertObject(data, {
			'props': {
				'description': {
					'optional': true,
					'type': 'string'
				},
				'jobs': {'type': 'array'},
				'nodeDescription': {
					'optional': true,
					'type': 'string'
				},
				'nodeName': {'type': 'string'},
				'url': {'type': 'string'}
			},
			'type': 'ServerData'
		});
		this._data = data;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		data.jobs = this._data.jobs.map((j: any) => new JobListingData(j));
		data.url = new URL(data.url);
	}

	/**
	 * The raw data retrieved from the API end point.
	 * @remarks
	 * This data has been verified to provide at least the properties defined on this class, but there may be
	 * more data in response that is useful elsewhere.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	get data () : any { return this._data; }

	/**
	 * A textual description of the server.
	 */
	get description () : string { return getOptionalStringProperty(this._data, 'description'); }

	/**
	 * The list of jobs in the root of the server.
	 */
	get jobs () : JobListingData[] { return this._data.jobs; }

	/**
	 * The description of the node hosting the server.
	 */
	get nodeDescription () : string { return getOptionalStringProperty(this._data, 'nodeDescription'); }

	/**
	 * The name of the node hosting the server.
	 */
	get nodeName () : string { return this._data.nodeName; }

	/**
	 * The URL for the server.
	 */
	get url () : string { return this._data.url; }
}
