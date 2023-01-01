import {BuildListingData, JobContainerData, JobListingData, JobObjectType, RestApi} from '../service';
import {Job} from './job';
import {JobContainerBase} from './jobcontainerbase';
import {JobItem} from './jobitem';
import {UnknownItem} from './unknownitem';

/**
 * Represents a container of jobs.
 * @public
 * @category Model
 */
export class JobContainer extends JobContainerBase {
	private _data : JobContainerData | undefined = undefined;
	private _listing : JobListingData;

	/** @internal */
	constructor (parent: JobItem, listing: JobListingData) {
		super(parent);
		this._listing = listing;
	}

	override get url () { return this._listing.url; }
	override get label () { return this._data ? this._data.displayName : this._listing.name; }
	override get description () { return this._data ? this._data.description : ''; }
	override get objectType () { return JobObjectType.jobContainer; }

	/** @internal */
	override async doRefreshData () : Promise<void> {
		const data = await RestApi.getJobContainer(this.url);
		const oldData = this._data;
		this._data = data;
		this.compareAndNotify(oldData, data, {
			'description': 'description',
			'label': 'label'
		});
		this.updateChildren(data.jobs);
	}


	/** @internal */
	override createChild (listing : JobListingData | BuildListingData) : JobItem {
		if (listing instanceof JobListingData) {
			if (listing.type === JobObjectType.job) return new Job(this, listing);
			else if (listing.type === JobObjectType.jobContainer) return new JobContainer(this, listing);
			else if (listing.type === JobObjectType.invalid) return new UnknownItem(this, listing);
		}
		throw Error('Invalid listing type');
	}
}
