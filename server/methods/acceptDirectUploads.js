import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Subscriptions } from 'meteor/rocketchat:models';

Meteor.methods({
	acceptDirectUploads(rid) {
		this.unblock();
		check(rid, String);

		const fromId = Meteor.userId();

		if (!fromId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'acceptDirectUploads',
			});
		}

		const room = Meteor.call('canAccessRoom', rid, fromId);

		if (!room) {
			return false;
		}

		const options = { fields: { _id: 1, isUploadsAccepted: 1 } };
		const subscription = Subscriptions.findOneByRoomIdAndUserId(rid, fromId, options);

		if (room.t === 'd' && !subscription) {
			return false;
		}

		return Subscriptions.acceptDirectUploads(subscription._id);
	},
});
