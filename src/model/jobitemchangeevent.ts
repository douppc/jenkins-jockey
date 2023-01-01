import {JobItem} from './jobitem';

/**
 * Represents a change to a JobItem.
 * This is emitted any time children or any properties of a JobItem have changed.
 * @public
 * @event
 */
export class JobItemChangeEvent {
	private _item : JobItem;
	private _changedProperties : string[] | undefined;

	/** @internal */
	constructor (item : JobItem, changedProperties : string[] | undefined = undefined) {
		this._item = item;
		this._changedProperties = changedProperties;
	}

	/**
	 * The item that was changed.
	 */
	get item () { return this._item; }

	/**
	 * Contains a list of names of properties that changed.
	 * If this is undefined, it means that all properties should be considered changed.
	 */
	get changedProperties () { return this._changedProperties; }

	/**
	 * Indicates whether a given property has changed.
	 * This is more convenient than checking the {@link JobItemChangeEvent.changedProperties} property since
	 * the property may be `undefined`, which indicates that all properties changed.
	 * @param prop - The name of the property to check.
	 * @returns true if the property changed, false otherwise.
	 */
	propertyChanged (prop: string) {
		return !this._changedProperties || this._changedProperties.includes(prop);
	}
}
