import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { hasPermission, canAccessRoom } from 'meteor/rocketchat:authorization';
import { Rooms } from 'meteor/rocketchat:models';
import { addUserToRoom, isUserBanned } from '../functions';

Meteor.methods({
	joinRoom(rid, code) {
		check(rid, String);

		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'joinRoom' });
		}

		if (isUserBanned(rid, Meteor.userId())) {
			throw new Meteor.Error('error-banned-user', 'Banned user', { method: 'joinRoom' });
		}

		const room = Rooms.findOneById(rid);

		if (!room) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'joinRoom' });
		}

		if (room.blocked) {
			throw new Meteor.Error('error-not-allowed', 'Room is blocked', {
				method: 'joinRoom',
			});
		}

		// TODO we should have a 'beforeJoinRoom' call back so external services can do their own validations
		const user = Meteor.user();
		if (!canAccessRoom(room, Meteor.user())) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'joinRoom' });
		}
		if ((room.joinCodeRequired === true) && (code !== room.joinCode) && !hasPermission(Meteor.userId(), 'join-without-join-code')) {
			throw new Meteor.Error('error-code-invalid', 'Invalid Room Password', { method: 'joinRoom' });
		}

		return addUserToRoom(rid, user);
	},
});
