import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { Users } from 'meteor/rocketchat:models';
import moment from 'moment';

Meteor.methods({
	deactivateUserForPeriod(userId, seconds, reason = '') {
		check(userId, String);
		check(seconds, Number);

		if (seconds < 0) {
			throw new Meteor.Error('error-invalid-param', 'Invalid param "seconds"', {
				method: 'deactivateUserForPeriod',
			});
		}

		const callerId = Meteor.userId();
		if (!callerId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'deactivateUserForPeriod',
			});
		}

		if (hasPermission(callerId, 'edit-other-user-active-status') !== true) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', {
				method: 'deactivateUserForPeriod',
			});
		}

		const user = Users.findOneById(userId);

		if (!user) {
			throw new Meteor.Error('error-invalid-param', 'Invalid param "userId"', {
				method: 'deactivateUserForPeriod',
			});
		}

		const until = moment().add(seconds, 'seconds');
		Users.deactivate(userId, until.toDate(), reason);

		// 		if (user.username) {
		// 			Subscriptions.setArchivedByUsername(user.username, true);
		// 		}
		//     Users.unsetLoginTokens(userId);

		return true;

	},
});
