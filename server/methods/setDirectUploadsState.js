import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Subscriptions, Messages } from 'meteor/rocketchat:models';

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

		const options = { fields: { _id: 1, uploadsState: 1, i: 1 } };
		const subscription = Subscriptions.findOneByRoomIdAndUserId(rid, fromId, options);

		if (room.t !== 'd' || !subscription) {
			return false;
		}

		console.log('setDirectUploadsState', state, subscription.i);
		if (state === 'declined' && subscription.i && subscription.i._id) {
			const sentFiles = Messages.findFilesByUserIdAndRoomId(subscription.i._id, room._id).fetch();
			if (sentFiles.length === 1) {
				Meteor.runAsUser(subscription.i._id, () => {
					Meteor.call('deleteMessage', sentFiles[0]);
				});
			}
		}
		return Subscriptions.updateUploadsSettingsById(subscription._id, { uploadsState: state });
	},
});
