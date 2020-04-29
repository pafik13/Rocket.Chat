import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { Messages, Complaints } from 'meteor/rocketchat:models';

Meteor.methods({
	complainAboutMessage(msgId, reason) {
		check(msgId, String);
		check(reason, String);

		const userId = Meteor.userId();
		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'complainAboutMessage' });
		}

		const message = Messages.findOneById(msgId);

		if (!message) {
			throw new Meteor.Error('error-invalid-message', 'Invalid message', { method: 'complainAboutMessage' });
		}

		if (!hasPermission(userId, 'complain-about-message')) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', { method: 'complainAboutMessage' });
		}

		return Complaints.createWithMsgId(message._id, reason, userId);
	},
});
