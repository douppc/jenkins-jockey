/* eslint-disable @typescript-eslint/no-explicit-any */
/* global URL */
import {classToType, JobObjectType} from './jobobjecttype';
import {assertObject} from './common';

/**
 * The data for a job listing supplied by the container of that job.
 * @public
 * @sealed
 * @category API Response
 */
export class JobListingData {
	private _data : any;

	/** @internal */
	constructor (data : any) {
		assertObject(data, {
			'props': {
				'_class': {'type': 'string'},
				'name': {'type': 'string'},
				'url': {'type': 'string'}
			},
			'type': 'JobListingData'
		});
		data.url = new URL(data.url);
		this._data = data;
	}

	/**
	 * The class name for the listing.
	 */
	get className () { return this._data._class; }

	/**
	 * The raw data retrieved from the API end point.
	 * @remarks
	 * This data has been verified to provide at least the properties defined on this class, but there may be
	 * more data in response that is useful elsewhere.
	 */
	get data () : any { return this._data; }

	/**
	 * The name of the job in the listing.
	 * This can be used for labelling the job without fetching the entire job.
	 */
	get name () : string { return this._data.name; }

	/**
	 * The type of the job listing.
	 * This indicates whether the child is a job container or a job. The type is determined from the class on
	 * the listing, using a built-in mapping of class names to listing and a configurable extra list of class
	 * names for those Jenkins Jockey is not aware of. See the documentation for {@link JobObjectType} for
	 * more details.
	 */
	get type () : JobObjectType { return classToType(this._data._class); }

	/**
	 * The URL for the job in the listing.
	 */
	get url () : URL { return this._data.url; }
}
