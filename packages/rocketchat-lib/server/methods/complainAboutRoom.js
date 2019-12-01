import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { Rooms, Complaints } from 'meteor/rocketchat:models';

Meteor.methods({
	complainAboutRoom(rid, reason) {
		check(rid, String);
		check(reason, String);

		const callerId = Meteor.userId();
		if (!callerId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'complainAboutRoom' });
		}

		const room = Rooms.findOneById(rid);
		if (!room) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'complainAboutRoom' });
		}

		if (!hasPermission(callerId, `complain-${ room.t }`)) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'complainAboutRoom' });
		}
		Complaints.createWithRoomId(rid, reason.toLowerCase(), callerId);

		return true;
	},
});
