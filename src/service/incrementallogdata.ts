
/**
 * The data for an incremental log request from the API endpoint.
 * @public
 * @category API Response
 */
export class IncrementalLogData {
	private _data;
	private _more;
	private _offset;

	/** @internal */
	constructor (data : string, more : boolean, offset : number) {
		this._data = data;
		this._more = more;
		this._offset = offset;
	}

	/**
	 * The current chunk of log data, which could be empty if nothing was written since the last poll.
	 */
	get data () : string { return this._data; }

	/**
	 * True if the build is still producing data, false otherwise.
	 * This is useful to stop polling since there won't ever be any more data when this is false.
	 */
	get more () : boolean { return this._more; }

	/**
	 * The offset to give for the next fetch of data.
	 */
	get offset () : number { return this._offset; }
}
