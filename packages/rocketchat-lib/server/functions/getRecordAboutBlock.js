import { Meteor } from 'meteor/meteor';
import { BlockedUsers } from 'meteor/rocketchat:models';

export const getRecordAboutBlock = function(userIds) {
	if (!Array.isArray(userIds)) {
		throw new Meteor.Error('error-invalid-param', 'Invalid param', {
			method: 'getRecordAboutBlock',
		});
	}
	if (userIds.length !== 2) {
		throw new Meteor.Error('error-invalid-param', 'Invalid param', {
			method: 'getRecordAboutBlock',
		});
	}
	const options = {
		fields: {
			blocker: 1,
			blocked: 1,
			reason: 1,
		},
	};
	const record = BlockedUsers.findByUserIds(userIds, options);
	return record;
};
