import { Meteor } from 'meteor/meteor';
import { Messages } from 'meteor/rocketchat:models';
import { deleteMessage } from '../functions';

const maxMessagesRemovedImmediately = 100;

Meteor.methods({
	deleteMessagesAfterBan(userId, roomId) {
		if (!userId) {
			throw new Meteor.Error('error-invalid-params', 'userId must be defined', {
				method: 'deleteMessagesAfterBan',
			});
		}
		if (!roomId) {
			throw new Meteor.Error('error-invalid-params', 'roomId must be defined', {
				method: 'deleteMessagesAfterBan',
			});
		}

		const caller = !Meteor.userId();
		if (caller) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'deleteMessagesAfterBan',
			});
		}
		const originalMessages = Messages.findByRoomIdAndUserId(roomId, userId, {
			fields: {
				u: 1,
				rid: 1,
				file: 1,
				ts: 1,
			},
			limit: maxMessagesRemovedImmediately,
			sort: { ts: -1 },
		}).fetch();

		for (let i = 0, len = originalMessages.length; i < len; i++) {
			deleteMessage(originalMessages[i], caller);
		}

		return true;
	},
});
