import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { createRoom } from '../functions';
import { validateUrl } from 'meteor/rocketchat:utils';

Meteor.methods({
	createChannel(name, members, readOnly = false, customFields = {}, extraData = {}) {
		check(name, String);
		check(members, Match.Optional([String]));

		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'createChannel' });
		}

		if (!hasPermission(Meteor.userId(), 'create-c')) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'createChannel' });
		}

		customFields = {
			// 			anonym_id: '',
			photoUrl: '',
			registeredAt: new Date().toISOString(),
			...customFields,
		};

		if (customFields.photoUrl && !validateUrl(customFields.photoUrl)) {
			throw new Meteor.Error('error-invalid-value', 'Invalid value: "photoUrl" must be a URL', { method: 'createChannel' });
		}

		return createRoom('c', name, Meteor.user() && Meteor.user().username, members, readOnly, { customFields, filesHidden: false, canMembersAddUser: true, linkVisible: true, ...extraData });
	},
});
