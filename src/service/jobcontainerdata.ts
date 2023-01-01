/* eslint-disable @typescript-eslint/no-explicit-any */
/* global URL */
import {assertObject, getOptionalStringProperty} from './common';
import {JobListingData} from './joblistingdata';

/**
 * The data for a job container supplied by the API endpoint.
 *
 * @public
 * @sealed
 * @category API Response
 */
export class JobContainerData {
	private _data : any;

	/** @internal */
	constructor (data : any) {
		assertObject(data, {
			'props': {
				'description': {
					'optional': true,
					'type': 'string'
				},
				'displayName': {'type': 'string'},
				'fullDisplayName': {'type': 'string'},
				'fullName': {'type': 'string'},
				'jobs': {'type': 'array'},
				'name': {'type': 'string'},
				'url': {'type': 'string'}
			},
			'type': 'JobContainerData'
		});
		this._data = data;
		data.jobs = this._data.jobs.map((j: any) => new JobListingData(j));
		data.url = new URL(data.url);
	}

	/**
	 * The raw data retrieved from the API end point.
	 * @remarks
	 * This data has been verified to provide at least the properties defined on this class, but there may be
	 * more data in response that is useful elsewhere.
	 */
	get data () : any { return this._data; }

	/**
	 * A textual description for the job container, may be empty.
	 */
	get description () : string { return getOptionalStringProperty(this._data, 'description'); }

	/**
	 * A name that can be used to display the job container in the tree.
	 */
	get displayName () : string { return this._data.displayName; }

	/**
	 * A longer display name that could be used in areas where longer strings can fit.
	 */
	get fullDisplayName () : string { return this._data.fullDisplayName; }

	/**
	 * The full name of the job.
	 */
	get fullName () : string { return this._data.fullName; }

	/**
	 * The list of child jobs.
	 */
	get jobs () : JobListingData[] { return this._data.jobs; }

	/**
	 * The name of the job.
	 */
	get name () : string { return this._data.name; }

	/**
	 * The URL for the job.
	 */
	get url () : string { return this._data.url; }
}
