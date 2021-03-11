import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Subscriptions, BlockedUsers } from 'meteor/rocketchat:models';

Meteor.methods({
	blockUser({ rid, blocked, reason = '' }) {

		check(rid, String);
		check(blocked, String);
		const callerId = Meteor.userId();

		if (!callerId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'blockUser' });
		}

		const subscription = Subscriptions.findOneByRoomIdAndUserId(rid, callerId);
		const subscription2 = Subscriptions.findOneByRoomIdAndUserId(rid, blocked);

		if (subscription && subscription2) {
			Subscriptions.setBlockedByRoomId(rid, blocked, callerId, reason);
		}

		BlockedUsers.createRecord(callerId, blocked, reason);

		return true;
	},
});
