import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { createRoom } from '../functions';
import { validateUrl } from 'meteor/rocketchat:utils';

Meteor.methods({
	createPrivateGroup(name, members, readOnly = false, customFields = {}, extraData = {}) {
		check(name, String);
		check(members, Match.Optional([String]));

		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'createPrivateGroup' });
		}

		if (!hasPermission(Meteor.userId(), 'create-p')) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'createPrivateGroup' });
		}

		// validate extra data schema
		check(extraData, Match.ObjectIncluding({
			tokenpass: Match.Maybe({
				require: String,
				tokens: [{
					token: String,
					balance: String,
				}],
			}),
		}));

		customFields = {
			anonym_id: -1,
			photoUrl: '',
			registeredAt: new Date().toISOString(),
			...customFields,
		};

		if (customFields.photoUrl && !validateUrl(customFields.photoUrl)) {
			throw new Meteor.Error('error-invalid-value', 'Invalid value: "photoUrl" must be a URL', { method: 'createChannel' });
		}

		return createRoom('p', name, Meteor.user() && Meteor.user().username, members, readOnly, { customFields, ...extraData });
	},
});
