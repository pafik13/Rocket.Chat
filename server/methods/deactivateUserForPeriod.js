import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { Users } from 'meteor/rocketchat:models';
import moment from 'moment';

Meteor.methods({
	deactivateUserForPeriod(userId, seconds) {
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

		console.log('deactivateUserForPeriod', userId, seconds);
		const now = moment();
		const until = moment().add(seconds, 'seconds');
		console.log('deactivateUserForPeriod', userId, now.toDate(), until.toDate());
		Users.deactivate(userId, until.toDate());

		// 		if (user.username) {
		// 			Subscriptions.setArchivedByUsername(user.username, true);
		// 		}
		//     Users.unsetLoginTokens(userId);

		return true;

	},
});
