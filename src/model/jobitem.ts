/* global URL */
import {Event, EventEmitter} from 'vscode';
import {JobItemChange} from './jobitemchange';
import {JobObjectType} from '../service';

/**
 * The different load states of a JobItem.
 * @public
 */
export enum JobItemLoadState {

	/** The JobItem has not been loaded from the server, only the listing from the parent. */
	sparse,

	/**  The JobItem is currently loading. */
	loading,

	/** The JobItem has been fully loaded. */
	loaded,

	/** An error occurred when trying to load the item. */
	error
}

/**
 * Represents a generic base class for all job items.
 * @public
 * @category Model
 */
export abstract class JobItem {
	private _children : JobItem[] = [];
	private _parent : JobItem | undefined;
	private _expanded = false;

	/** @internal */
	protected _onDidChangeData : EventEmitter<JobItemChange> = new EventEmitter<JobItemChange>();
	private _batchCount = 0;
	private _changedProp : Set<string> = new Set<string>();
	private _loadState : JobItemLoadState = JobItemLoadState.sparse;
	private _lastError = '';
	private _refreshPromise : Promise<void> | undefined;
	private static _nextId = 0;
	private _id = 0;

	/** @internal */
	constructor (parent : JobItem | undefined) {
		this._parent = parent;
		this._id = JobItem._nextId++;
	}

	/**
	 * Event fired when the data for the job item changes (properties, children, etc).
	 * @eventProperty
	 */
	readonly onDidChangeData : Event<JobItemChange> = this._onDidChangeData.event;

	/**
	 * The unique ID of this instance of job item.
	 * This can be useful for tracking connections to this specific instance of job item.
	 */
	get id () { return this._id; }

	/**
	 * The label that can be used to display the item in a UI.
	 * The default implementation returns the label that was set on construction. If this label changes
	 */
	abstract readonly label : string;

	/**
	 * True if the item has been expanded (i.e. its children and data are available), false otherwise.
	 * @readonly
	 */
	get expanded () : boolean { return this._expanded; }
	private set expanded (b : boolean) {
		if (b !== this._expanded) {
			this._expanded = b;
			this.notifyPropertyChange('expanded');
		}
	}

	/**
	 * The children of the job item.
	 */
	get children () : JobItem[] { return this._children; }
	protected set children (newChildren : JobItem[]) {
		if (this._children.length !== newChildren.length ||
				newChildren.some((c, i) => c.url !== this._children[i].url)) {
			this._children = newChildren;
			this.notifyPropertyChange('children');
		}
	}

	/**
	 * The parent of the job item. This is undefined if the job item is the {@link JobItem.root}.
	 */
	get parent () : JobItem | undefined { return this._parent; }

	/**
	 * The root job item (with no parent) of this item.
	 */
	get root () : JobItem { return this.parent ? this.parent.root : this; }

	/**
	 * The URL for the job item.
	 */
	abstract readonly url : URL;

	/**
	 * The load state of the JobItem.
	 */
	get loadState () : JobItemLoadState { return this._loadState; }

	/**
	 * Indicates whether the job item is enabled.
	 * The default implementation assumes always enabled.
	 */
	get enabled () : boolean { return true; }

	/**
	 * A description of the job item that may be useful for detailed information like a tooltip.
	 * The default implementation returns an empty string.
	 */
	get description () : string { return ''; }

	/**
	 * The last error that occurred during a refresh.
	 * This is cleared the next time a refresh occurs.
	 */
	get lastError () : string { return this._lastError; }

	/**
	 * Retrieves the object data type for this item.
	 */
	get objectType () : JobObjectType { return JobObjectType.invalid; }

	/**
	 * Retrieves the list of children of a certain type recursively.
	 * @param type The object data type for the children to retrieve.
	 */
	public getAllChildren (type : JobObjectType | undefined = undefined) {
		const cf = this.children.filter(c => !type || c.objectType === type);
		this._children.forEach(c => cf.push(...c.getAllChildren(type)));
		return cf;
	}

	/**
	 * Refreshes the data for the item as well as its list children (but not the children themselves).
	 * This method does nothing if the object is not currently {@link JobItem.expanded}.
	 */
	async refreshData () : Promise<void> {
		if (!this._expanded || this._loadState === JobItemLoadState.loading) return Promise.resolve();
		if (this._refreshPromise) return this._refreshPromise;
		this._loadState = JobItemLoadState.loading;
		await this.executeBatch(() => {
			if (this._lastError.length !== 0) {
				this._lastError = '';
				this.notifyPropertyChange('lastError');
			}
			this.notifyPropertyChange('loadState');
		});
		try {
			await this.executeBatch(async () => {
				this._refreshPromise = this.doRefreshData();
				await this._refreshPromise;
			});
			this._refreshPromise = undefined;
		} catch (e) {
			this._refreshPromise = undefined;
			await this.executeBatch(async () => {
				this._loadState = JobItemLoadState.error;
				await this.executeBatch(() => {
					this.notifyPropertyChange('loadState');
					if (e instanceof Error) {
						this._lastError = e.message;
						this.notifyPropertyChange('lastError');
					}
				});
			});
			throw e;
		} finally {
			if (this._loadState === JobItemLoadState.loading) {
				this._loadState = JobItemLoadState.loaded;
				this._onDidChangeData.fire(new JobItemChange(this, ['loadState']));
			}
		}
		return Promise.resolve();
	}

	/**
	 * Expands the children and data of the node.
	 * This should be overridden by deriving classes to actually expand the data.
	 */
	async expand () : Promise<void> {
		if (!this._expanded) {
			this._expanded = true;
			this._onDidChangeData.fire(new JobItemChange(this, ['expanded']));
			await this.refreshData();
		}
	}

	/**
	 * @internal
	 * Refreshes data for the job item.
	 * This is not called until expand() is called at least once. This function is already called within a
	 * batch so you do not have to worry about executing anything inside this function within a batch to get
	 * batched property changes.
	 */
	protected abstract doRefreshData() : Promise<void>;

	/**
	 * @internal
	 * Executes the given callback in a batch, where property changes are batched into a single event.
	 * This function makes it possible to execute some code that sets properties in a batch so as to limit the
	 * event to a single fire, while also making it impossible for the batch to not be finished in the case of
	 * an exception that would normally disrupt control flow.
	 * @param cb - The callback to be called inside the batch.
	 */
	protected async executeBatch (cb : ()=>void) {
		this._batchCount++;
		try {
			await cb();
		} finally {
			this._batchCount--;
			if (this._batchCount === 0) {
				this._onDidChangeData.fire(new JobItemChange(this, Array.from(this._changedProp)));
			}
		}
	}

	/**
	 * @internal
	 * Sends (or queues if in a batch) notification that a property changed.
	 * @param prop - The name of the property that changed.
	 */
	protected notifyPropertyChange (prop : string) {
		if (this._batchCount) this._changedProp.add(prop);
		else this._onDidChangeData.fire(new JobItemChange(this, [prop]));
	}

	/**
	 * @internal
	 * Compares a set of properties on an object and notifies for property changes on this item.
	 * @param obj1 - The first object to compare.
	 * @param obj2 - The second object to compare.
	 * @param props - The list of properties to check (as keys) with their properties to notify (as values).
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	protected compareAndNotify (obj1 : {[key: string] : any} | undefined,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		obj2 : {[key: string] : any} | undefined, props : {[key: string] : string}) {
		for (const [
			key,
			value
		] of Object.entries(props)) {
			if (!obj1 || !obj2 || obj1[key] !== obj2[key]) this.notifyPropertyChange(value);
		}
	}
}
