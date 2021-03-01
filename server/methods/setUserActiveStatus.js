import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { Users, Subscriptions } from 'meteor/rocketchat:models';

Meteor.methods({
	setUserActiveStatus(userId, active) {
		check(userId, String);
		check(active, Boolean);

		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'setUserActiveStatus',
			});
		}

		if (hasPermission(Meteor.userId(), 'edit-other-user-active-status') !== true) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', {
				method: 'setUserActiveStatus',
			});
		}

		const user = Users.findOneById(userId);

		if (!user) {
			return false;
		}

		Users.setUserActive(userId, active);

		if (user.username) {
			Subscriptions.setArchivedByUsername(user.username, !active);
		}

		if (active === false) {
			Users.unsetLoginTokens(userId);
		} else {
			Users.unsetReason(userId);
		}
		return true;
	},
});
