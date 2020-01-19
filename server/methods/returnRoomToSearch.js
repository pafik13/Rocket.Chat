import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { hasRole } from 'meteor/rocketchat:authorization';
import { Rooms } from 'meteor/rocketchat:models';

Meteor.methods({
	returnRoomToSearch(rid) {
		check(rid, String);

		const callerId = Meteor.userId();

		if (!callerId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'returnRoomToSearch',
			});
		}

		if (!hasRole(callerId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin');
		}

		const room = Rooms.findOneById(rid);

		if (!room) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', {
				method: 'returnRoomToSearch',
			});
		}

		const result = Rooms.update({ _id: rid }, { $unset: { blacklisted: 1 } });

		return result;
	},
});
