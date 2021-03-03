import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { handleError, t } from 'meteor/rocketchat:utils';
import { popover } from 'meteor/rocketchat:ui-utils';
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
	uploadsState() {
		return Template.instance().form.uploadsState.get();
	},
	uploadsStateValue() {
		const value = Template.instance().form.uploadsState.get();
		return t(`UploadsState_${ value }`);
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
	isLinksAllowed() {
		return Template.instance().form.isLinksAllowed.get();
	},
	disabled() {
		const { original, form } = Template.instance();
		return Object.keys(original).every((key) => original[key].get() === form[key].get());
	},
});

Template.filesPreferencesFlexTab.onRendered(() => {
	const rid = Session.get('openedRoom');
	const room = ChatRoom.findOne({ _id: rid }, { fields: { t: 1 } }) || {};
	this.$('#uploadsState').prop('disabled', room.t !== 'd');
	this.$('#isLinksAllowed').prop('disabled', room.t !== 'd');
});

Template.filesPreferencesFlexTab.onCreated(function() {
	const fileTypes = ['Image', 'Audio', 'Video', 'Other'];
	const values = {};
	const options = { fields: { t: 1 } };
	for (let i = 0, len = fileTypes.length; i < len; i++) {
		options.fields[`is${ fileTypes[i] }FilesAllowed`] = 1;
		values[`is${ fileTypes[i] }FilesAllowed`] = true;
	}

	options.fields.uploadsState = 1;
	values.uploadsState = 'acceptedAll';

	const rid = Session.get('openedRoom');

	const room = ChatRoom.findOne({ _id: rid }, options) || {};
	if (room.t !== 'd') {
		for (let i = 0, len = fileTypes.length; i < len; i++) {
			values[`is${ fileTypes[i] }FilesAllowed`] = room[`is${ fileTypes[i] }FilesAllowed`] ;
		}
	} else {
		options.fields.isLinksAllowed = 1;
		const sub = ChatSubscription.findOne({ rid }, options) || {};
		console.log('filesPreferencesFlexTab:sub', sub);
		for (let i = 0, len = fileTypes.length; i < len; i++) {
			values[`is${ fileTypes[i] }FilesAllowed`] = sub[`is${ fileTypes[i] }FilesAllowed`] ;
		}
		values.uploadsState = sub.uploadsState || 'acceptedAll';
		values.isLinksAllowed = sub.isLinksAllowed;
	}

	this.original = {
		uploadsState: new ReactiveVar(values.uploadsState),
		isImageFilesAllowed: new ReactiveVar(values.isImageFilesAllowed),
		isAudioFilesAllowed: new ReactiveVar(values.isAudioFilesAllowed),
		isVideoFilesAllowed: new ReactiveVar(values.isVideoFilesAllowed),
		isOtherFilesAllowed: new ReactiveVar(values.isOtherFilesAllowed),
		isLinksAllowed: new ReactiveVar(values.isLinksAllowed),
	};

	this.form = {
		uploadsState: new ReactiveVar(values.uploadsState),
		isImageFilesAllowed: new ReactiveVar(values.isImageFilesAllowed),
		isAudioFilesAllowed: new ReactiveVar(values.isAudioFilesAllowed),
		isVideoFilesAllowed: new ReactiveVar(values.isVideoFilesAllowed),
		isOtherFilesAllowed: new ReactiveVar(values.isOtherFilesAllowed),
		isLinksAllowed: new ReactiveVar(values.isLinksAllowed),
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

	'click #uploadsState'(e) {
		const instance = Template.instance();
		const value = instance.form.uploadsState.get();

		const options = [
			'needAccept',
			'acceptedOne',
			'acceptedAll',
			'declined',
		].map((item) => {
			const key = `UploadsState_${ item }`;
			return {
				id: key,
				name: 'uploadsState',
				label: key,
				value: item,
			};
		});

		const config = {
			popoverClass: 'files-preferences',
			template: 'filesPreferencesPopover',
			data: {
				change : (val) => { console.log(val); instance.form.uploadsState.set(val); },
				value,
				options,
			},
			currentTarget: e.currentTarget,
			offsetVertical: e.currentTarget.clientHeight + 10,
		};
		popover.open(config);
	},

});


Template.filesPreferencesPopover.onCreated(function() {
	this.change = this.data.change;
});

Template.filesPreferencesPopover.onRendered(function() {
	this.find(`[value=${ this.data.value }]`).checked = true;
});

Template.filesPreferencesPopover.helpers({
	options() {
		return Template.instance().data.options;
	},
});
Template.filesPreferencesPopover.events({
	'change input'(e, instance) {
		instance.change && instance.change(e.target.value);
	},
});
