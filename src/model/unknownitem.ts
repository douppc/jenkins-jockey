import {JobItem} from './jobitem';
import {JobListingData} from '../service';


/**
 * A job item type for unknown types supplied by the Jenkins server.
 * @remarks
 * This class exists to serve as a placeholder for listings that Jenkins Jockey is unaware of. It makes it
 * possible to see items even though Jenkins Jockey doesn't really know what they are, and it provides a means
 * to instruct Jenkins Jockey on what it is and how to interpret it (through configuration).
 */
export class UnknownItem extends JobItem {
	private _listing : JobListingData;

	/** @internal */
	constructor (parent: JobItem, listing: JobListingData) {
		super(parent);
		this._listing = listing;
	}


	/** @internal */
	override async doRefreshData (): Promise<void> {}

	/**
	 * {@inheritDoc JobItem.url}
	 * @override
	 */
	override get url () { return this._listing.url; }

	/**
	 * {@inheritDoc JobItem.label}
	 * @override
	 */
	override get label () { return this._listing.name; }

	/**
	 * The class name for the unknown item.
	 */
	get className () { return this._listing.className; }
}
