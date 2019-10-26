import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { handleError } from 'meteor/rocketchat:utils';
import { ChatRoom, ChatSubscription } from 'meteor/rocketchat:models';

const call = (method, ...params) => new Promise((resolve, reject) => {
	Meteor.call(method, ...params, (err, result) => {
		if (err) {
			handleError(err);
			return reject(err);
		}
		return resolve(result);
	});
});

Template.filesPreferencesFlexTab.helpers({
//   canChangeUploadsAccept() {
//     const rid = Session.get('openedRoom');
//   	const room = ChatRoom.findOne({ _id: rid }, options) || {};
//     return room.t === 'd';
//   },
	isUploadsAccepted() {
		return Template.instance().form.isUploadsAccepted.get();
	},
	isImageFilesAllowed() {
		return Template.instance().form.isImageFilesAllowed.get();
	},
	isAudioFilesAllowed() {
		return Template.instance().form.isAudioFilesAllowed.get();
	},
	isVideoFilesAllowed() {
		return Template.instance().form.isVideoFilesAllowed.get();
	},
	isOtherFilesAllowed() {
		return Template.instance().form.isOtherFilesAllowed.get();
	},
	disabled() {
		const { original, form } = Template.instance();
		return Object.keys(original).every((key) => original[key].get() === form[key].get());
	},
});

Template.filesPreferencesFlexTab.onRendered(() => {
	const rid = Session.get('openedRoom');
	const room = ChatRoom.findOne({ _id: rid }, { fields: { t: 1 } }) || {};
	this.$('#isUploadsAccepted').prop('disabled', room.t !== 'd');
});

Template.filesPreferencesFlexTab.onCreated(function() {
	const fileTypes = ['Image', 'Audio', 'Video', 'Other'];
	const values = {};
	const options = { fields: { t: 1 } };
	for (let i = 0, len = fileTypes.length; i < len; i++) {
		options.fields[`is${ fileTypes[i] }FilesAllowed`] = 1;
		values[`is${ fileTypes[i] }FilesAllowed`] = true;
	}

	options.fields.isUploadsAccepted = 1;
	values.isUploadsAccepted = true;

	const rid = Session.get('openedRoom');

	const room = ChatRoom.findOne({ _id: rid }, options) || {};
	if (room.t !== 'd') {
		for (let i = 0, len = fileTypes.length; i < len; i++) {
			values[`is${ fileTypes[i] }FilesAllowed`] = room[`is${ fileTypes[i] }FilesAllowed`] ;
		}
	} else {
		const sub = ChatSubscription.findOne({ rid }, options) || {};
		console.log('filesPreferencesFlexTab:sub', sub);
		for (let i = 0, len = fileTypes.length; i < len; i++) {
			values[`is${ fileTypes[i] }FilesAllowed`] = sub[`is${ fileTypes[i] }FilesAllowed`] ;
		}
		values.isUploadsAccepted = sub.isUploadsAccepted;
	}

	this.original = {
		isUploadsAccepted: new ReactiveVar(values.isUploadsAccepted),
		isImageFilesAllowed: new ReactiveVar(values.isImageFilesAllowed),
		isAudioFilesAllowed: new ReactiveVar(values.isAudioFilesAllowed),
		isVideoFilesAllowed: new ReactiveVar(values.isVideoFilesAllowed),
		isOtherFilesAllowed: new ReactiveVar(values.isOtherFilesAllowed),
	};

	this.form = {
		isUploadsAccepted: new ReactiveVar(values.isUploadsAccepted),
		isImageFilesAllowed: new ReactiveVar(values.isImageFilesAllowed),
		isAudioFilesAllowed: new ReactiveVar(values.isAudioFilesAllowed),
		isVideoFilesAllowed: new ReactiveVar(values.isVideoFilesAllowed),
		isOtherFilesAllowed: new ReactiveVar(values.isOtherFilesAllowed),
	};

	this.saveSetting = async() => {
		const settings = {};
		const allKeys = Object.keys(this.original);
		let field;
		for (let i = 0, len = allKeys.length; i < len; i++) {
			field = allKeys[i];
			if (this.original[field].get() !== this.form[field].get()) {
				settings[field] = this.form[field].get();
			}
		}
		console.log('saveSetting', settings);
		const keys = Object.keys(settings);
		if (!keys.length) { return; }

		const rid = Session.get('openedRoom');
		await call('saveUploadsSettings', rid, settings);

		for (let i = 0, len = keys.length; i < len; i++) {
			field = keys[i];
			if (this.original[field].get() === this.form[field].get()) {
				return;
			}
			this.original[field].set(this.form[field].get());
		}
	};
});

Template.filesPreferencesFlexTab.events({
	'click .js-cancel'(e, instance) {
		instance.data.tabBar.close();
	},

	'click .js-save'(e, instance) {
		e.preventDefault();
		instance.saveSetting();
	},

	'change input[type=checkbox]'(e, instance) {
		e.preventDefault();
		console.log(e);
		const name = $(e.currentTarget).attr('name');
		// 		const checked = ['disableNotifications', 'hideUnreadStatus'].includes(name) ? !e.currentTarget.checked : e.currentTarget.checked;
		const { checked } = e.currentTarget;
		instance.form[name].set(checked);
	},

});
