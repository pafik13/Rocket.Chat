import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { Messages } from 'meteor/rocketchat:models';

Meteor.methods({
	markMessageAsDelivered(message) {
		check(message, Match.ObjectIncluding({
			_id: String,
		}));
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'markMessageAsDelivered',
			});
		}
		const originalMessage = Messages.findOneById(message._id, {});
		if (originalMessage == null) {
			throw new Meteor.Error('error-action-not-allowed', 'Not allowed', {
				method: 'markMessageAsDelivered',
				action: 'Mark_As_Delivered',
			});
		}
		Messages.markMessageAsDeliveredById(message._id);
		return true;
	},
});
