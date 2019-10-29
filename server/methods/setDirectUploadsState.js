import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Subscriptions } from 'meteor/rocketchat:models';

Meteor.methods({
	setDirectUploadsState(rid, state) {
		this.unblock();
		check(rid, String);
		check(state, String);

		if (!['needAccept', 'acceptedOne', 'acceptedAll', 'declined'].includes(state)) {
			throw new Meteor.Error('error-invalid-state', 'Invalid state', {
				method: 'setDirectUploadsState',
			});
		}

		const fromId = Meteor.userId();

		if (!fromId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'setDirectUploadsState',
			});
		}

		const room = Meteor.call('canAccessRoom', rid, fromId);

		if (!room) {
			return false;
		}

		const options = { fields: { _id: 1, uploadsState: 1 } };
		const subscription = Subscriptions.findOneByRoomIdAndUserId(rid, fromId, options);

		if (room.t !== 'd' || !subscription) {
			return false;
		}

		return Subscriptions.updateUploadsSettingsById(subscription._id, { uploadsState: state });
	},
});
