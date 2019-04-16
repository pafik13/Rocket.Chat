import { Meteor } from 'meteor/meteor';
import { Users, Subscriptions } from 'meteor/rocketchat:models';

Meteor.publish('activeUsers', function() {
	const userId = Meteor.userId();

	if (!userId) {
		return this.ready();
	}

	const records = Subscriptions.findByUserIdAndType(userId, 'd', { fields: { i: 1 } }).fetch();

	const userIds = records.map((record) => record.i._id);

	return Users.findUsersWithUsernameByIdsNotOffline(userIds, {
		fields: {
			username: 1,
			name: 1,
			status: 1,
			utcOffset: 1,
		},
	});
});
