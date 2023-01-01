import {BuildListingData, JobListingData} from '../service';
import {JobItem} from './jobitem';

/**
 * Base class for job items that contain other job items (servers, jobs, and job containers).
 * @public
 * @category Model
 */
export abstract class JobContainerBase extends JobItem {

	/** @internal */
	protected updateChildren (listings : JobListingData[] | BuildListingData[]) {
		const childrenByUrlType : {[key: string] : JobItem} = {};
		this.children.forEach(c => {
			childrenByUrlType[`${c.objectType}:${c.url.toString()}`] = c;
		});
		this.children = listings.map(l => {
			if (`${l.type}:${l.url.toString()}` in childrenByUrlType) {
				return childrenByUrlType[`${l.type}:${l.url.toString()}`];
			}
			return this.createChild(l);
		});
	}

	/** @internal */
	protected abstract createChild(listing : JobListingData | BuildListingData) : JobItem;
}
