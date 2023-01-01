import {Config} from '../config';

/**
 * Converts a class name used by Jenkins to an object type used by Jenkins Jockey.
 * @param c - A class name referred to by Jenkins.
 * @returns The corresponding object type.
 */
export function classToType (c : string) : JobObjectType {
	if (c === 'hudson.model.Hudson') {
		return JobObjectType.server;
	} else if (c === 'jenkins.branch.OrganizationFolder' ||
			c === 'org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject' ||
			c === 'com.cloudbees.hudson.plugins.folder.Folder') {
		return JobObjectType.jobContainer;
	} else if (c === 'org.jenkinsci.plugins.workflow.job.WorkflowJob') {
		return JobObjectType.job;
	} else if (c === 'org.jenkinsci.plugins.workflow.job.WorkflowRun') {
		return JobObjectType.build;
	} else if (Config.getExtraJobContainerClasses().includes(c)) {
		return JobObjectType.jobContainer;
	} else if (Config.getExtraJobClasses().includes(c)) {
		return JobObjectType.job;
	}
	return JobObjectType.invalid;
}

/**
 * The possible types of job objects.
 * @remarks
 *
 * These job object types are used to instantiate a concrete class for these in the {@link model}, so that
 * there can then be specific functionality supplied to it. Since Jenkins Jockey employs lazy loading of the
 * graph, it only knows the listing information of an item in the tree until that item has been fully
 * expanded. This can take considerable time, or may never even happen if the user hasn't actually seen the
 * object (i.e. the parent was expanded via API and the children weren't visible in the tree view). Without
 * the lazy loading, it may cause completely unnecessary API calls for objects the user doesn't see and would
 * make tree node expansion terribly slow, at least on large servers with huge lists of jobs.
 *
 * To facilitate this lazy loading, the type is derived from the class associated to a child in the listing on
 * the parent. Jenkins API has a `jobs` property that lists the children, which Jenkins Jockey uses to expand
 * the children. A new {@link Job} or {@link JobContainer} is created for each entry in that list, but to know
 * which class to create, it uses the `_class` property from that listing to determine whether it is a
 * container or a job. While we have knowledge of a few plugins that provide job containers and jobs, it is
 * impossible to guarantee which for plugins we've never seen. To combat this, we provide a facility to
 * configure additional classes that can be considered {@link Job} and {@link JobContainer} via the
 * {@link Config.extraJobClasses} and {@link Config.extraJobContainerClasses} functions, respectively.
 *
 * If a class is encountered that Jenkins Jockey does not recognize, the label will have an " (unknown)"
 * suffix and there will be two commands in the contextual menu that allow the user to say whether that object
 * is a job or job container. This is ultimately shorthand for adding those classes to the configuration by
 * hand or by calling the {@link Config.addExtraJobClass} or {@link Config.addExtraJobContainerClass}
 * functions to add them automatically.
 *
 * @public
 */
export enum JobObjectType {

	/** The object represents a server and its data is a ServerData. */
	server,

	/** The object represents a container of jobs and its data is a JobContainerData */
	jobContainer,

	/** The object represents a job and its data is a JobData */
	job,

	/** The object represents a build and its data is a BuildData */
	build,

	/** The object is an invalid type */
	invalid
}
