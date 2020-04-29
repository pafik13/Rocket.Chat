import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { hyphenate } from 'meteor/rocketchat:utils';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { Subscriptions, Rooms, Messages } from 'meteor/rocketchat:models';

Meteor.methods({
	saveUploadsSettings(roomId, settings) {
		const userId = Meteor.userId();
		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'saveUploadsSettings' });
		}

		check(roomId, String);
		const keys = {
			uploadsState: Match.Optional(String),
			isImageFilesAllowed: Match.Optional(Boolean),
			isAudioFilesAllowed: Match.Optional(Boolean),
			isVideoFilesAllowed: Match.Optional(Boolean),
			isOtherFilesAllowed: Match.Optional(Boolean),
		};
		check(settings, Match.ObjectIncluding(keys));

		const user = Meteor.user();
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
			delete settings.uploadsState;
			Rooms.updateUploadsSettingsById(roomId, settings);
		}

		Object.keys(settings).forEach((k) => {
			if (!settings.hasOwnProperty(k)) { return; }

			let type = '';
			switch (k) {
				case 'isImageFilesAllowed':
					type = settings[k] ? 'images-allowed' : 'images-disallowed';
					break;
				case 'isAudioFilesAllowed':
					type = settings[k] ? 'audios-allowed' : 'audios-disallowed';
					break;
				case 'isVideoFilesAllowed':
					type = settings[k] ? 'videos-allowed' : 'videos-disallowed';
					break;
				case 'isOtherFilesAllowed':
					type = settings[k] ? 'others-allowed' : 'others-disallowed';
					break;
				case 'uploadsState':
					type = `uploads-${ hyphenate(settings[k]) }`;
					break;
				default:
					return;
			}

			Messages.createRoomSettingsChangedWithTypeRoomIdMessageAndUser(type, roomId, user.username, user);
		});

		return true;
	},
});
