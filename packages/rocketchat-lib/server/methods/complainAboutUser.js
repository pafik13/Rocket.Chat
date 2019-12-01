import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { Users, Complaints } from 'meteor/rocketchat:models';

Meteor.methods({
	complainAboutUser(uid, reason) {
		check(uid, String);
		check(reason, String);

		const callerId = Meteor.userId();
		if (!callerId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid caller', { method: 'complainAboutUser' });
		}

		const user = Users.findOneById(uid);
		if (!user) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'complainAboutUser' });
		}

		if (!hasPermission(callerId, 'complain-u')) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'complainAboutUser' });
		}
		Complaints.createWithUserId(user._id, reason.toLowerCase(), callerId);

		return true;
	},
});
