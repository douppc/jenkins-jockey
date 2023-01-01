/* eslint-disable @typescript-eslint/no-explicit-any */
import {assertObject} from './common';

/**
 * A health report entry for a build.
 * @public
 * @sealed
 * @category API Response
 */
export class HealthReportData {
	private _data : any;

	/** @internal */
	constructor (data : any) {
		assertObject(data, {
			'props': {
				'description': {'type': 'string'},
				'score': {'type': 'number'}
			},
			'type': 'HealthReport'
		});
		this._data = data;
	}

	/**
	 * Retrieves the description of the health report.
	 */
	get description () : string { return this._data.description; }

	/**
	 * The score of the health report.
	 * This is an integer from 0 to 100.
	 */
	get score () : number { return this._data.score; }
}
