import { Meteor } from 'meteor/meteor';
import { Match } from 'meteor/check';
import { TAPi18n } from 'meteor/tap:i18n';
import { Rooms, Settings, Subscriptions, Messages } from 'meteor/rocketchat:models';
import { settings } from 'meteor/rocketchat:settings';
import { fileUploadIsValidContentType } from 'meteor/rocketchat:utils';
import { canAccessRoom } from 'meteor/rocketchat:authorization';
import filesize from 'filesize';

let maxFileSize = 0;

export const FileUpload = {
	validateFileUpload(file) {
		if (!Match.test(file.rid, String)) {
			return false;
		}

		// 		console.log('validateFileUpload', file);

		// livechat users can upload files but they don't have an userId
		const user = file.userId ? Meteor.users.findOne(file.userId) : null;

		const room = Rooms.findOneById(file.rid, {
			fields: {
				t: 1,
				isImageFilesAllowed: 1,
				isAudioFilesAllowed: 1,
				isVideoFilesAllowed: 1,
				isOtherFilesAllowed: 1,
			},
		});
		const directMessageAllow = settings.get('FileUpload_Enabled_Direct');
		const fileUploadAllowed = settings.get('FileUpload_Enabled');
		if (canAccessRoom(room, user, file) !== true) {
			return false;
		}
		const language = user ? user.language : 'en';
		// Here check of rights
		if (!fileUploadAllowed) {
			const reason = TAPi18n.__('FileUpload_Disabled', language);
			throw new Meteor.Error('error-file-upload-disabled', reason);
		}

		let fileType = 'Other';
		if (/^audio\/.+/.test(file.type)) {
			fileType = 'Audio';
		} else if (/^image\/.+/.test(file.type)) {
			fileType = 'Image';
		} else if (/^video\/.+/.test(file.type)) {
			fileType = 'Video';
		}

		const preferences = {
			isImageFilesAllowed: true,
			isAudioFilesAllowed: true,
			isVideoFilesAllowed: true,
			isOtherFilesAllowed: true,
		};

		const prefKeys = Object.keys(preferences);
		if (room.t !== 'd') {
			for (let i = 0, len = prefKeys.length, key = ''; i < len; i++) {
				key = prefKeys[i];
				if (room.hasOwnProperty(key)) {
					preferences[key] = room[key];
				}
			}
		} else {
			if (!directMessageAllow) {
				const reason = TAPi18n.__('File_not_allowed_direct_messages', language);
				throw new Meteor.Error('error-direct-message-file-upload-not-allowed', reason);
			}

			const subscription = Subscriptions.findOneByRoomIdAndInterlocutorId(room._id, user._id);
			//       console.log('subscription', subscription);
			if (typeof subscription.isUploadsAccepted === 'undefined') {
				Subscriptions.disableDirectUploads(subscription._id);
			} else if (!subscription.isUploadsAccepted) {
				const sentFilesCount = Messages.findFilesByUserIdAndRoomId(user._id, room._id).count();
				//         console.log('sentFilesCount', sentFilesCount);
				if (sentFilesCount > 0) {
					const reason = TAPi18n.__('File_not_accepted_by_interlocutor', language);
					throw new Meteor.Error('error-direct-message-file-upload-not-accepted', reason);
				}
			} else {
				console.log('validateFileUpload', subscription);

				for (let i = 0, len = prefKeys.length, key = ''; i < len; i++) {
					key = prefKeys[i];
					if (subscription.hasOwnProperty(key)) {
						preferences[key] = subscription[key];
					}
				}
			}
		}

		console.log('validateFileUpload', fileType, preferences);
		if (!preferences[`is${ fileType }FilesAllowed`]) {
			const reason = TAPi18n.__('File_type_is_not_allowed', language);
			throw new Meteor.Error('error-invalid-file-type', reason);
		}

		// -1 maxFileSize means there is no limit
		if (maxFileSize > -1 && file.size > maxFileSize) {
			const reason = TAPi18n.__('File_exceeds_allowed_size_of_bytes', {
				size: filesize(maxFileSize),
			}, language);
			throw new Meteor.Error('error-file-too-large', reason);
		}

		// 		console.log('fileUploadIsValidContentType', file.type);
		if (!fileUploadIsValidContentType(file.type)) {
			const reason = TAPi18n.__('File_type_is_not_accepted', language);
			throw new Meteor.Error('error-invalid-file-type', reason);
		}

		return true;
	},
};

settings.get('FileUpload_MaxFileSize', function(key, value) {
	try {
		maxFileSize = parseInt(value);
	} catch (e) {
		maxFileSize = Settings.findOneById('FileUpload_MaxFileSize').packageValue;
	}
});
