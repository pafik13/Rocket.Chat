import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { Random } from 'meteor/random';
import { Uploads } from 'meteor/rocketchat:models';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { FileUpload } from '../lib/FileUpload';
import _ from 'underscore';

Meteor.methods({
	async sendFileMessage(roomId, store, file, msgData = {}) {
		const callUserId = Meteor.userId();
		if (!callUserId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'sendFileMessage' });
		}

		const room = Meteor.call('canAccessRoom', roomId, callUserId);

		if (!room) {
			return false;
		}

		check(msgData, {
			_id: Match.Optional(String),
			avatar: Match.Optional(String),
			emoji: Match.Optional(String),
			alias: Match.Optional(String),
			groupable: Match.Optional(Boolean),
			msg: Match.Optional(String),
			isVoice: Match.Optional(Boolean),
		});

		Uploads.updateFileComplete(file._id, callUserId, _.omit(file, '_id'));

		const fileUrl = `/file-upload/${ file._id }/${ encodeURI(file.name) }`;

		const attachment = {
			title: file.name,
			type: 'file',
			description: file.description,
			title_link: fileUrl,
			title_link_download: true,
		};

		if (/^image\/.+/.test(file.type)) {
			attachment.image_url = fileUrl;
			attachment.image_type = file.type;
			attachment.image_size = file.size;
			if (file.identify && file.identify.size) {
				attachment.image_dimensions = file.identify.size;
			}
			try {
				attachment.image_preview = await FileUpload.resizeImagePreview(file);
			} catch (e) {
				delete attachment.image_url;
				delete attachment.image_type;
				delete attachment.image_size;
				delete attachment.image_dimensions;
			}
		} else if (/^audio\/.+/.test(file.type)) {
			attachment.audio_url = fileUrl;
			attachment.audio_type = file.type;
			attachment.audio_size = file.size;
			if (file.identify && file.identify.duration) {
				attachment.audio_duration = file.identify.duration;
			}
		} else if (/^video\/.+/.test(file.type)) {
			attachment.video_url = fileUrl;
			attachment.video_type = file.type;
			attachment.video_size = file.size;
			if (file.identify) {
				if (file.identify.duration) {
					attachment.video_duration = file.identify.duration;
				}
				if (file.identify.height && file.identify.width) {
					attachment.video_dimensions = {
						height: file.identify.height,
						width: file.identify.width,
					};
				}
				if (file.identify.fps) {
					attachment.video_fps = file.identify.fps;
				}
				if (file.identify.preview) {
					const results = await Promise.all([FileUpload.uploadVideoPreview(file.identify.preview, callUserId), FileUpload.resizeVideoPreview(file.identify.preview)]);
					attachment.video_preview_url = results[0] ;
					attachment.video_preview = results[1];
				}
			}
		}

		const user = Meteor.user();
		msgData._id = msgData._id || Random.id();
		let msg = Object.assign({
			rid: roomId,
			ts: new Date(),
			msg: '',
			file: {
				_id: file._id,
				name: file.name,
				type: file.type,
			},
			groupable: false,
			attachments: [attachment],
		}, msgData);

		msg = Meteor.call('sendMessage', msg);

		Meteor.defer(() => callbacks.run('afterFileUpload', { user, room, message: msg }));

		return msg;
	},
});
