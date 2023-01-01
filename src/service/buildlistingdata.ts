/* eslint-disable @typescript-eslint/no-explicit-any */
/* global URL */
import {assertObject} from './common';
import {JobObjectType} from './jobobjecttype';

/**
 * The data for a build listing supplied by a job.
 * @public
 * @sealed
 * @category API Response
 */
export class BuildListingData {
	private _data : any;

	/** @internal */
	constructor (data : any) {
		assertObject(data, {
			'props': {
				'number': {'type': 'number'},
				'url': {'type': 'string'}
			},
			'type': 'BuildListingData'
		});
		data.url = new URL(data.url);
		this._data = data;
	}

	/**
	 * The raw data retrieved from the API end point.
	 * @remarks
	 * This data has been verified to provide at least the properties defined on this class, but there may be
	 * more data in response that is useful elsewhere.
	 */
	get data () : any { return this._data; }

	/**
	 * The build number for the build in the listing.
	 * This can be used to label the build before fetching the entirety of the build's data.
	 */
	get number () : number { return this._data.number; }

	/**
	 * The type of the listing. There is only one valid type for now.
	 */
	get type () { return JobObjectType.build; }

	/**
	 * The URL for the build.
	 */
	get url () : URL { return this._data.url; }
}
