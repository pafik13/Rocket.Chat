import { Meteor } from 'meteor/meteor';
import { Match } from 'meteor/check';
import { Rooms, Subscriptions, Users, BannedUsers } from 'meteor/rocketchat:models';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { settings } from 'meteor/rocketchat:settings';
import { addUserToRoom } from '../functions';

Meteor.methods({
	addUsersToRoom(data = {}) {
		// Validate user and room
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'addUsersToRoom',
			});
		}

		if (!Match.test(data.rid, String)) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', {
				method: 'addUsersToRoom',
			});
		}

		// Get user and room details
		const room = Rooms.findOneById(data.rid);

		if (room.blocked) {
			throw new Meteor.Error('error-not-allowed', 'Room is blocked', {
				method: 'addUsersToRoom',
			});
		}

		const userId = Meteor.userId();
		const subscription = Subscriptions.findOneByRoomIdAndUserId(data.rid, userId, { fields: { _id: 1 } });
		const userInRoom = subscription != null;

		// Can't add to direct room ever
		if (room.t === 'd') {
			throw new Meteor.Error('error-cant-invite-for-direct-room', 'Can\'t invite user to direct rooms', {
				method: 'addUsersToRoom',
			});
		}

		// Can add to any room you're in, with permission, otherwise need specific room type permission
		let canAddUser = false;
		if (room.canMembersAddUser) {
			canAddUser = true;
		} else if (userInRoom && hasPermission(userId, 'add-user-to-joined-room', room._id)) {
			canAddUser = true;
		}

		// Adding wasn't allowed
		if (!canAddUser) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', {
				method: 'addUsersToRoom',
			});
		}

		// Missing the users to be added
		if (!Array.isArray(data.users)) {
			throw new Meteor.Error('error-invalid-arguments', 'Invalid arguments', {
				method: 'addUsersToRoom',
			});
		}

		if (room.t === 'p') {
			const maxMembers = settings.get('Rooms_Max_Group_Members');
			if (room.usersCount + data.users.length > maxMembers) {
				throw new Meteor.Error('error-reached-users-limit', 'Reached users limit', {
					method: 'addUsersToRoom',
				});
			}
		}

		// Validate each user, then add to room
		const user = Meteor.user();
		data.users.forEach((username) => {
			const newUser = Users.findOneByUsername(username, {
				fields: { username: 1, name: 1, active: 1, 'settings.preferences': 1 },
			});
			if (!newUser) {
				throw new Meteor.Error('error-invalid-username', 'Invalid username', {
					method: 'addUsersToRoom',
				});
			}
			if (BannedUsers.isUserIsBanned(room._id, newUser._id)) {
				throw new Meteor.Error('error-user-is-banned', 'Banned user', {
					method: 'addUsersToRoom',
				});
			}
			if (newUser.settings && newUser.settings.preferences) {
				const { isRoomInviteAllowed } = newUser.settings.preferences;
				if (typeof isRoomInviteAllowed === 'boolean' && !isRoomInviteAllowed) {
					throw new Meteor.Error('error-user-disallow-invite', 'Disallow invite', {
						method: 'addUsersToRoom',
					});
				}
			}
			addUserToRoom(data.rid, newUser, user);
		});

		return true;
	},
});
