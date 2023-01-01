
/**
 * The data for a file inluded in a replay supplied by the API endpoint.
 * @public
 * @sealed
 * @category API Response
 */
export class ReplayFileData {
	private _contents;
	private _formName;
	private _label;

	/** @internal */
	constructor (contents : string, formName : string, label : string) {
		this._contents = contents;
		this._formName = formName;
		this._label = label;
	}

	/**
	 * The entire contents of the file.
	 */
	get contents () : string { return this._contents; }

	/**
	 * The name of the file used in the HTML form.
	 * This is important to be maintained for executing the replay.
	 */
	get formName () : string { return this._formName; }

	/**
	 * A label to give the file when displaying.
	 */
	get label () : string { return this._label; }

}
