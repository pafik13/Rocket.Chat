import { Meteor } from 'meteor/meteor';
import { MessageTypes } from 'meteor/rocketchat:ui-utils';
import { t } from 'meteor/rocketchat:utils';

Meteor.startup(function() {
	MessageTypes.registerType({
		id: 'images-allowed',
		system: true,
		message: 'Images_allowed_by',
		data(message) {
			return {
				user_by: message.msg,
			};
		},
	});
	MessageTypes.registerType({
		id: 'images-disallowed',
		system: true,
		message: 'Images_disallowed_by',
		data(message) {
			return {
				user_by: message.msg,
			};
		},
	});
	MessageTypes.registerType({
		id: 'audios-allowed',
		system: true,
		message: 'Audios_allowed_by',
		data(message) {
			return {
				user_by: message.msg,
			};
		},
	});
	MessageTypes.registerType({
		id: 'audios-disallowed',
		system: true,
		message: 'Audios_disallowed_by',
		data(message) {
			return {
				user_by: message.msg,
			};
		},
	});
	MessageTypes.registerType({
		id: 'videos-allowed',
		system: true,
		message: 'Videos_allowed_by',
		data(message) {
			return {
				user_by: message.msg,
			};
		},
	});
	MessageTypes.registerType({
		id: 'videos-disallowed',
		system: true,
		message: 'Videos_disallowed_by',
		data(message) {
			return {
				user_by: message.msg,
			};
		},
	});
	MessageTypes.registerType({
		id: 'others-allowed',
		system: true,
		message: 'Others_allowed_by',
		data(message) {
			return {
				user_by: message.msg,
			};
		},
	});
	MessageTypes.registerType({
		id: 'others-disallowed',
		system: true,
		message: 'Others_disallowed_by',
		data(message) {
			return {
				user_by: message.msg,
			};
		},
	});

	MessageTypes.registerType({
		id: 'links-allowed',
		system: true,
		message: 'Links_allowed_by',
		data(message) {
			return {
				user_by: message.msg,
			};
		},
	});
	MessageTypes.registerType({
		id: 'links-disallowed',
		system: true,
		message: 'Links_disallowed_by',
		data(message) {
			return {
				user_by: message.msg,
			};
		},
	});

	MessageTypes.registerType({
		id: 'uploads-need-accept',
		system: true,
		message: 'Uploads_state_changed_by',
		data(message) {
			return {
				user_by: message.msg,
				uploads_state: t('UploadsState_needAccept'),
			};
		},
	});
	MessageTypes.registerType({
		id: 'uploads-accepted-one',
		system: true,
		message: 'Uploads_state_changed_by',
		data(message) {
			return {
				user_by: message.msg,
				uploads_state: t('UploadsState_acceptedOne'),
			};
		},
	});
	MessageTypes.registerType({
		id: 'uploads-accepted-all',
		system: true,
		message: 'Uploads_state_changed_by',
		data(message) {
			return {
				user_by: message.msg,
				uploads_state: t('UploadsState_acceptedAll'),
			};
		},
	});
	MessageTypes.registerType({
		id: 'uploads-declined',
		system: true,
		message: 'Uploads_state_changed_by',
		data(message) {
			return {
				user_by: message.msg,
				uploads_state: t('UploadsState_declined'),
			};
		},
	});
});
