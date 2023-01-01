/* eslint-disable @typescript-eslint/no-explicit-any */
/* global URL */
import {assertObject, getOptionalStringProperty} from './common';

/**
 * The data for a build supplied by the API endpoint.
 * @public
 * @sealed
 * @category API Response
 */
export class BuildData {
	private _data : any;

	/** @internal */
	constructor (data : any) {
		assertObject(data, {
			'props': {
				'building': {'type': 'boolean'},
				'description': {
					'optional': true,
					'type': 'string'
				},
				'displayName': {
					'optional': true,
					'type': 'string'
				},
				'duration': {'type': 'number'},
				'estimatedDuration': {'type': 'number'},
				'fullDisplayName': {
					'optional': true,
					'type': 'string'
				},
				'id': {'type': 'string'},
				'number': {'type': 'number'},
				'result': {
					'optional': true,
					'type': 'string',
					'values': [
						'SUCCEEDED',
						'FAILED',
						'ABORTED',
						'UNSTABLE'
					]
				},
				'timestamp': {'type': 'number'},
				'url': {'type': 'string'}
			},
			'type': 'BuildData'
		});
		this._data = data;
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
	 * Indicates whether or not the build is currently still building.
	 */
	get building () : boolean { return this._data.building; }

	/**
	 * A description for the build (may be empty).
	 */
	get description () : string { return getOptionalStringProperty(this._data, 'description'); }

	/**
	 * A display name for the build (may be empty).
	 */
	get displayName () : string { return getOptionalStringProperty(this._data, 'displayName'); }

	/**
	 * The duration of the build in seconds.
	 */
	get duration () : number { return this._data.duration; }

	/**
	 * The estimated duration of the build in seconds.
	 */
	get estimatedDuration () : number { return this._data.estimatedDuration; }

	/**
	 * The full display name of the build (may be empty).
	 */
	get fullDisplayName () : string { return getOptionalStringProperty(this._data, 'description'); }

	/**
	 * The ID of the build (usually same as the build number)
	 */
	get id () : string { return this._data.id; }

	/**
	 * The build number.
	 */
	get number () : number { return this._data.number; }

	/**
	 * The result of the build, only valid if the build is finished.
	 */
	get result () : string { return getOptionalStringProperty(this._data, 'result'); }

	/**
	 * The timestamp when the build was triggered.
	 */
	get timestamp () : number { return this._data.timestamp; }

	/**
	 * The URL for the build.
	 */
	get url () : string { return this._data.url; }
}
