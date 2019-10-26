import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { Subscriptions, Rooms } from 'meteor/rocketchat:models';

Meteor.methods({
	saveUploadsSettings(roomId, settings) {
		const userId = Meteor.userId();
		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'saveUploadsSettings' });
		}
		check(roomId, String);
		const keys = {
			isImageFilesAllowed: Match.Optional(Boolean),
			isAudioFilesAllowed: Match.Optional(Boolean),
			isVideoFilesAllowed: Match.Optional(Boolean),
			isOtherFilesAllowed: Match.Optional(Boolean),
		};
		check(settings, Match.ObjectIncluding(keys));

		const subscription = Subscriptions.findOneByRoomIdAndUserId(roomId, userId);
		if (!subscription) {
			throw new Meteor.Error('error-invalid-subscription', 'Invalid subscription', { method: 'saveUploadsSettings' });
		}

		if (subscription.t === 'd') {
			Subscriptions.updateUploadsSettingsById(subscription._id, settings);
		} else {
			if (!hasPermission(userId, 'edit-room', roomId)) {
				throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'saveUploadsSettings', action: 'Editing_room' });
			}
			delete settings.isUploadsAccepted;
			Rooms.updateUploadsSettingsById(roomId, settings);
		}

		return true;
	},
});
