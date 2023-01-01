/* eslint-disable @typescript-eslint/no-explicit-any */
/* global URL */
import {assertObject, getOptionalStringProperty} from './common';
import {BuildListingData} from './buildlistingdata';
import {HealthReportData} from './healthreportdata';


/**
 * The data for a job supplied by the API endpoint.
 * @public
 * @sealed
 * @category API Response
 */
export class JobData {
	private _data : any;

	/** @internal */
	constructor (data : any) {
		assertObject(data, {
			'props': {
				'buildable': {'type': 'boolean'},
				'builds': {
					'emptyArray': true,
					'type': 'array'
				},
				'color': {'type': 'string',
					'values': [
						'aborted',
						'blue',
						'blue_anime',
						'disabled',
						'notbuilt',
						'red',
						'red_anime',
						'yellow',
						'yellow_anime'
					]},
				'description': {
					'optional': true,
					'type': 'string'
				},
				'displayName': {
					'optional': true,
					'type': 'string'
				},
				'fullDisplayName': {
					'optional': true,
					'type': 'string'
				},
				'fullName': {
					'optional': true,
					'type': 'string'
				},
				'healthReport': {
					'emptyArray': true,
					'type': 'array'
				},
				'name': {'type': 'string'},
				'url': {'type': 'string'}
			},
			'type': 'JobData'
		});
		this._data = data;
		data.builds = data.builds.map((build: any) => new BuildListingData(build));
		data.healthReport = data.healthReport.map((h: any) => new HealthReportData(h));
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
	 * Indicates whether or not the job is buildable.
	 */
	get buildable () : boolean { return this._data.buildable; }

	/**
	 * The list of builds for the job.
	 * This can be an empty list.
	 */
	get builds () : BuildListingData[] { return this._data.builds; }

	/**
	 * The color reported by Jenkins for the job.
	 * This is generally useful to see the status of the latest build for the job.
	 */
	get color () : string { return this._data.color; }

	/**
	 * The description of the job, which can be empty.
	 */
	get description () { return getOptionalStringProperty(this._data, 'description'); }

	/**
	 * The display name for the job, which can be empty.
	 */
	get displayName () { return getOptionalStringProperty(this._data, 'displayName'); }

	/**
	 * The full display name for the job, which can be empty.
	 */
	get fullDisplayName () { return getOptionalStringProperty(this._data, 'fullDisplayName'); }

	/**
	 * The full name of the job.
	 */
	get fullName () { return getOptionalStringProperty(this._data, 'fullName'); }

	/**
	 * The health report objects.
	 */
	get healthReport () : HealthReportData[] { return this._data.healthReport; }

	/**
	 * The name of the job.
	 */
	get name () : string { return this._data.name; }

	/**
	 * The URL for the job.
	 */
	get url () : URL { return this._data.url; }
}
