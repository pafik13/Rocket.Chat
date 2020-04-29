import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { settings } from 'meteor/rocketchat:settings';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { Messages } from 'meteor/rocketchat:models';
import { Markdown } from 'meteor/rocketchat:markdown';
import { redis } from '../lib';

const objectMaybeIncluding = (types) => Match.Where((value) => {
	Object.keys(types).forEach((field) => {
		if (value[field] != null) {
			try {
				check(value[field], types[field]);
			} catch (error) {
				error.path = field;
				throw error;
			}
		}
	});

	return true;
});

const validateAttachmentsFields = (attachmentField) => {
	check(attachmentField, objectMaybeIncluding({
		short: Boolean,
		title: String,
		value: Match.OneOf(String, Match.Integer, Boolean),
	}));

	if (typeof attachmentField.value !== 'undefined') {
		attachmentField.value = String(attachmentField.value);
	}

};

const validateAttachmentsActions = (attachmentActions) => {
	check(attachmentActions, objectMaybeIncluding({
		type: String,
		text: String,
		url: String,
		image_url: String,
		is_webview: Boolean,
		webview_height_ratio: String,
		msg: String,
		msg_in_chat_window: Boolean,
	}));
};

const validateAttachment = (attachment) => {
	check(attachment, objectMaybeIncluding({
		color: String,
		text: String,
		ts: Match.OneOf(String, Match.Integer),
		thumb_url: String,
		button_alignment: String,
		actions: [Match.Any],
		message_link: String,
		collapsed: Boolean,
		author_name: String,
		author_link: String,
		author_icon: String,
		title: String,
		title_link: String,
		title_link_download: Boolean,
		image_dimensions: Object,
		image_url: String,
		image_preview: String,
		image_type: String,
		image_size: Number,
		audio_url: String,
		audio_type: String,
		audio_size: Number,
		video_url: String,
		video_type: String,
		video_size: Number,
		fields: [Match.Any],
	}));

	if (attachment.fields && attachment.fields.length) {
		attachment.fields.map(validateAttachmentsFields);
	}

	if (attachment.actions && attachment.actions.length) {
		attachment.actions.map(validateAttachmentsActions);
	}
};

const validateBodyAttachments = (attachments) => attachments.map(validateAttachment);

export const sendMessage = function(user, message, room, upsert = false) {
	if (!user || !message || !room._id) {
		return false;
	}

	check(message, objectMaybeIncluding({
		_id: String,
		msg: String,
		text: String,
		alias: String,
		emoji: String,
		avatar: String,
		attachments: [Match.Any],
	}));

	if (Array.isArray(message.attachments) && message.attachments.length) {
		validateBodyAttachments(message.attachments);
	}

	if (!message.ts) {
		message.ts = new Date();
	}
	const { _id, username, name } = user;
	message.u = {
		_id,
		username,
		name,
	};
	message.rid = room._id;

	if (!Match.test(message.msg, String)) {
		message.msg = '';
	}

	if (message.ts == null) {
		message.ts = new Date();
	}

	if (settings.get('Message_Read_Receipt_Enabled')) {
		message.unread = true;
	}

	if (message.parseUrls !== false) {
		message.html = message.msg;
		message = Markdown.code(message);

		const urls = message.html.match(/([A-Za-z]{3,9}):\/\/([-;:&=\+\$,\w]+@{1})?([-A-Za-z0-9\.]+)+:?(\d+)?((\/[-\+=!:~%\/\.@\,\(\)\w]*)?\??([-\+=&!:;%@\/\.\,\w]+)?(?:#([^\s\)]+))?)?/g);
		if (urls) {
			message.urls = urls.map((url) => ({ url }));
		}

		message = Markdown.mountTokensBack(message, false);
		message.msg = message.html;
		delete message.html;
		delete message.tokens;
	}

	message = callbacks.run('beforeSaveMessage', message);
	if (message) {
		let msgsInRedis = Promise.await(redis.incr(room._id));
		if (msgsInRedis <= room.msgs) {
			msgsInRedis = room.msgs + 1;
			Promise.await(redis.set(room._id, msgsInRedis));
		}
		message.serverId = msgsInRedis;

		// Avoid saving sandstormSessionId to the database
		let sandstormSessionId = null;
		if (message.sandstormSessionId) {
			sandstormSessionId = message.sandstormSessionId;
			delete message.sandstormSessionId;
		}

		if (message._id && upsert) {
			const { _id } = message;
			delete message._id;
			Messages.upsert({
				_id,
				'u._id': message.u._id,
			}, message);
			message._id = _id;
		} else {
			message._id = Messages.insert(message);
		}

		/*
		Defer other updates as their return is not interesting to the user
		*/
		Meteor.defer(() => {
			// Execute all callbacks
			message.sandstormSessionId = sandstormSessionId;
			return callbacks.run('afterSaveMessage', message, room, user._id);
		});
		return message;
	}
};
