import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Subscriptions } from 'meteor/rocketchat:models';

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

		Subscriptions.updateUploadsSettingsById(subscription._id, settings);

		return true;
	},
});
