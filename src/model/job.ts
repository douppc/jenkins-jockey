import {BuildListingData, JobData, JobListingData, JobObjectType, RestApi} from '../service';
import {Build} from './build';
import {JobContainerBase} from './jobcontainerbase';
import {JobItem} from './jobitem';

/**
 * The status of the job.
 */
export enum JobStatus {

	/** The last build for the job was aborted. */
	aborted,

	/** The last build for the job succeeded. */
	succeeded,

	/** The job has not been built. */
	notbuilt,

	/** The last build for the job failed. */
	failed,

	/** The last build for the job was unstable. */
	unstable,

	/** The job has not yet been loaded. */
	invalid
}

/**
 * Represents a job in Jenkins.
 * @public
 * @sealed
 * @category Model
 */
export class Job extends JobContainerBase {
	private _data : JobData | undefined = undefined;
	private _listing : JobListingData;

	/** @internal */
	constructor (parent: JobItem, listing: JobListingData) {
		super(parent);
		this._listing = listing;
	}


	/**
	 * {@inheritDoc JobItem.url}
	 * @override
	 */
	override get url () { return this._listing.url; }

	/**
	 * {@inheritDoc JobItem.label}
	 * @override
	 */
	override get label () { return this._data ? this._data.displayName : this._listing.name; }

	/**
	 * {@inheritDoc JobItem.description}
	 * @override
	 */
	override get description () { return this._data ? this._data.description : ''; }

	/**
	 * {@inheritDoc JobItem.objectType}
	 * @override
	 */
	override get objectType () { return JobObjectType.job; }

	/** @internal */
	async doRefreshData () : Promise<void> {
		const data = await RestApi.getJob(this.url);
		const oldData = this._data;
		this._data = data;
		this.compareAndNotify(oldData, data, {
			'buildable': 'buildable',
			'description': 'description'
		});
		this.updateChildren(data.builds);
	}


	/** @internal */
	override createChild (listing : JobListingData | BuildListingData) : JobItem {
		if (listing instanceof BuildListingData) return new Build(this, listing);
		throw Error('Invalid listing type');
	}


	/**
	 * Indicates whether the job is buildable.
	 */
	get buildable () : boolean { return this._data ? this._data.buildable : false; }

	/**
	 * Retrieves the health percentage of the builds in the job.
	 */
	get health () : number {
		if (this._data) {
			let worst = 100;
			this._data.healthReport.forEach(h => {
				if (h.score < worst) worst = h.score;
			});
			return worst;
		}
		// eslint-disable-next-line no-magic-numbers
		return 100;
	}

	/**
	 * The status of the most recent build for the job, if there is one.
	 */
	get status () {
		if (this._data) {
			switch (this._data.color) {
			case 'aborted':
				return JobStatus.aborted;
			case 'blue':
			case 'blue_anime':
				return JobStatus.succeeded;
			case 'notbuilt':
				return JobStatus.notbuilt;
			case 'red':
			case 'red_anime':
				return JobStatus.failed;
			case 'yellow':
			case 'yellow_anime':
				return JobStatus.unstable;
			default:
				return JobStatus.invalid;
			}
		}
		return JobStatus.invalid;
	}
}
