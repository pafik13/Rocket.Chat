import { Meteor } from 'meteor/meteor';
import { Subscriptions } from 'meteor/rocketchat:models';
import { hasPermission } from 'meteor/rocketchat:authorization';

Meteor.methods({
	getUsersOfRoomByRole(rid, role) {
		console.log('getUsersOfRoomByRole', role);

		if (!role) {
			throw new Meteor.Error('error-invalid-role', 'Invalid role', { method: 'getUsersOfRoomByRole' });
		}

		const userId = Meteor.userId();
		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'getUsersOfRoomByRole' });
		}

		const room = Meteor.call('canAccessRoom', rid, userId);
		if (!room) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'getUsersOfRoomByRole' });
		}

		if (room.broadcast && !hasPermission(userId, 'view-broadcast-member-list', rid)) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'getUsersOfRoomByRole' });
		}

		const users = Subscriptions.findUsersInRoles([role]);

		return {
			total: users.count(),
			records: users.fetch(),
		};
	},
});
