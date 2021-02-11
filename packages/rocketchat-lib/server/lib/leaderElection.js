import { InstanceStatus } from 'meteor/konecty:multiple-instances-status';
import { Logger } from 'meteor/rocketchat:logger';
const logger = new Logger('leaderElection', {});

export const isLeader = async() => {
	const instances = await InstanceStatus.getCollection().rawCollection().distinct('_id');
	logger.debug(instances);
	instances.sort();
	const result = instances[0] === InstanceStatus.id();
	logger.log('isLeader:', result);
	return result;
};
