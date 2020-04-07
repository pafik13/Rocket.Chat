import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Subscriptions } from 'meteor/rocketchat:models';

Meteor.methods({
	acceptChannel(rid) {
		this.unblock();
		check(rid, String);

		const fromId = Meteor.userId();

		if (!fromId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'acceptChannel',
			});
		}

		const room = Meteor.call('canAccessRoom', rid, fromId);

		if (!room) {
			return false;
		}

		const options = { fields: { _id: 1, unaccepted: 1 } };
		const subscription = Subscriptions.findOneByRoomIdAndUserId(rid, fromId, options);

		if (room.t === 'c' && !subscription) {
			return false;
		}

		return Subscriptions.accept(subscription._id);
	},
});
