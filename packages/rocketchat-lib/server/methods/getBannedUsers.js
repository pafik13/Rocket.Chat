import { Meteor } from 'meteor/meteor';
import { BannedUsers, Users } from 'meteor/rocketchat:models';
import { hasPermission } from 'meteor/rocketchat:authorization';

Meteor.methods({
	getBannedUsers(rid) {
		const userId = Meteor.userId();
		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'getBannedUsers' });
		}

		const room = Meteor.call('canAccessRoom', rid, userId);
		if (!room) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'getBannedUsers' });
		}

		if (room.broadcast && !hasPermission(userId, 'view-broadcast-member-list', rid)) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'getBannedUsers' });
		}

		const bannedUsers = BannedUsers.findByRoomId(rid, { fields: { userId: 1 } }).fetch();
		const userIds = bannedUsers.map((bu) => bu.userId);

		const users = Users.findByIds(userIds, { fields: { name: 1, username: 1, status: 1, customFields: 1 } });
		return {
			total: users.count(),
			records: users.fetch(),
		};
	},
});
