/* global NodeJS, clearTimeout, setTimeout */
import {BuildData, BuildListingData, RestApi} from '../service';
import {JobItem} from './jobitem';

// Time between refreshData calls for builds that are still building.
const runningBuildRefresh = 3000;

/**
 * The possible statuses of the build.
 */
export enum BuildStatus {

	/** The build is still running. */
	building,

	/** The build has failed. */
	failed,

	/** The build succeeded. */
	succeeded,

	/** The build finished with an unstable condition (usually failed tests). */
	unstable,

	/** The build was aborted before it finished. */
	aborted,

	/** The build has not been fetched yet. */
	invalid
}

/**
 * Represents a build of a job in Jenkins.
 * @public
 * @sealed
 * @category Model
 */
export class Build extends JobItem {
	private _data : BuildData | undefined = undefined;
	private _listing : BuildListingData;
	private _refreshTimer : NodeJS.Timer | undefined;

	/** @internal */
	constructor (parent: JobItem, listing: BuildListingData) {
		super(parent);
		this._listing = listing;
	}

	/**
	 * {@inheritDoc JobItem.url
	 * @override
	 */
	override get url () { return this._listing.url; }

	/**
	 * {@inheritDoc JobItem.label}
	 * @override
	 */
	override get label () {
		return this._data ? this._data.displayName : `#${this._listing.number.toString()}`;
	}

	/**
	 * {@inheritDoc JobItem.description}
	 * @override
	 */
	override get description () { return this._data ? this._data.description : ''; }

	/** @internal */
	protected override async doRefreshData (): Promise<void> {
		const data = await RestApi.getBuild(this.url);
		if (this._refreshTimer) clearTimeout(this._refreshTimer);
		const oldData = this._data;
		if (data.building) this._refreshTimer = setTimeout(this.refreshData.bind(this), runningBuildRefresh);
		this._data = data;
		this.compareAndNotify(oldData, data, {
			'building': 'status',
			'description': 'description',
			'label': 'label',
			'result': 'status'
		});
	}

	/**
	 * The raw data retrieved from the Jenkins API endpoint for this build.
	 */
	get data () : BuildData | undefined { return this._data; }

	/**
	 * The listing on the parent job object that originated this build.
	 * Unlike the {@link Build.data} property, this is guaranteed to be defined.
	 */
	get listing () : BuildListingData { return this._listing; }

	/**
	 * The current status of the build.
	 */
	get status () {
		if (!this._data) return BuildStatus.invalid;
		else if (this._data.building) return BuildStatus.building;
		else if (this._data.result === 'SUCCESS') return BuildStatus.succeeded;
		else if (this._data.result === 'FAILURE') return BuildStatus.failed;
		else if (this._data.result === 'ABORTED') return BuildStatus.aborted;
		return BuildStatus.unstable;
	}

	/**
	 * Indicates whether the build succeeded.
	 * This will be false until the build has finished.
	 */
	get succeeded () : boolean | undefined { return this._data?.result === 'SUCCESS'; }
}
