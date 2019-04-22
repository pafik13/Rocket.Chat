import { Meteor } from 'meteor/meteor';
import { Users, Subscriptions } from 'meteor/rocketchat:models';
import { Logger } from 'meteor/rocketchat:logger';

const logger = new Logger('activeUsers');

Meteor.publish('activeUsers', function() {
	const userId = Meteor.userId();

	if (!userId) {
		return this.ready();
	}

	const records = Subscriptions.findByUserIdAndType(userId, 'd', { fields: { i: 1 } }).fetch();

	logger.info('records', records);

	const userIds = [];
	for (let r = 0, len = records.length; r < len; r++) {
		const record = records[r];
		if (record.i) {
			userIds.push(record.i._id);
		}
	}
	logger.info('userIds', userIds);

	const options = {
		fields: {
			username: 1,
			name: 1,
			status: 1,
			utcOffset: 1,
		},
	};

	return Users.findUsersWithUsernameByIdsNotOffline(userIds, options);
});
