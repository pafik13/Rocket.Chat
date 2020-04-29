import { Meteor } from 'meteor/meteor';
import { Messages } from 'meteor/rocketchat:models';

Meteor.methods({
	getMessageOffsetFromLast(messageId) {
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'getMessageOffsetFromLast',
			});
		}

		const message = Messages.getMessageById(messageId);

		if (!message) {
			throw new Meteor.Error('error-invalid-messageId', 'Invalid messageId', {
				method: 'getMessageOffsetFromLast',
			});
		}

		const query = {
			ts: { $gte: message.ts },
			rid: message.rid,
			_hidden: { $ne: true },
		};
		return Messages.find(query).count();
	},
});
