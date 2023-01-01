import {Servers} from './servers';

export {Build, BuildStatus} from './build';
export {Job, JobStatus} from './job';
export {JobContainer} from './jobcontainer';
export {JobContainerBase} from './jobcontainerbase';
export {JobItem, JobItemLoadState} from './jobitem';
export {JobItemChange} from './jobitemchange';
export {Server} from './server';
export {Servers} from './servers';

/**
 * A namespace for the model containing a representation of the jobs and builds on the connected Jenkins
 * servers.
 * @public
 */
export namespace model {

	/**
	 * The list of servers that have been connected.
	 */
	export const servers : Servers = new Servers();
}
