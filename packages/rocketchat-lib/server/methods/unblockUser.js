import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Subscriptions, BlockedUsers } from 'meteor/rocketchat:models';

Meteor.methods({
	unblockUser({ rid, blocked }) {

		check(rid, String);
		check(blocked, String);
		const callerId = Meteor.userId();

		if (!callerId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'unblockUser' });
		}

		const subscription = Subscriptions.findOneByRoomIdAndUserId(rid, callerId);
		const subscription2 = Subscriptions.findOneByRoomIdAndUserId(rid, blocked);

		if (!subscription || !subscription2) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', { method: 'unblockUser' });
		}

		Subscriptions.unsetBlockedByRoomId(rid, blocked, callerId);
		BlockedUsers.deleteRecord(callerId, blocked);

		return true;
	},
});
