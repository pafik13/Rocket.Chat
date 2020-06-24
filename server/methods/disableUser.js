import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { Users } from 'meteor/rocketchat:models';

Meteor.methods({
	disableUser(userId) {
		check(userId, String);

		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'disableUser',
			});
		}

		if (hasPermission(Meteor.userId(), 'edit-other-user-active-status') !== true) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', {
				method: 'disableUser',
			});
		}

		const user = Users.findOneById(userId);

		if (!user) {
			return false;
		}

		Users.disableById(userId);

		return true;

	},
});
