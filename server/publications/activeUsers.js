import { Meteor } from 'meteor/meteor';
import { Users, Subscriptions } from 'meteor/rocketchat:models';

Meteor.publish('activeUsers', function() {
	const userId = Meteor.userId();

	if (!userId) {
		return this.ready();
	}

	const pub = this;

	const records = Subscriptions.findByUserIdAndType(userId, 'd', { fields: { i: 1 } }).fetch();

	const userIds = records.map((record) => record.i._id);

	const options = {
		fields: {
			username: 1,
			name: 1,
			status: 1,
			utcOffset: 1,
		},
	};

	const cursorHandle = Users.findUsersWithUsernameByIdsNotOffline(userIds, options).observeChanges({
		added(_id, record) {
			record.realAction = 'added';
			return pub.added('users', _id, record);
		},
		changed(_id, record) {
			pub.removed('users', _id, record);
			const user = Users.findOneById(_id, options);
			user.realAction = 'changed';
			return pub.added('users', _id, user);
		},
		removed(_id, record) {
			pub.removed('users', _id, record);
			const user = Users.findOneById(_id, options);
			user.realAction = 'removed';
			return pub.added('users', _id, user);
		},
	});

	this.ready();

	this.onStop(function() {
		return cursorHandle.stop();
	});
});
