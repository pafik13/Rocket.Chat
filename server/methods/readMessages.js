import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { Subscriptions, Rooms, Messages } from 'meteor/rocketchat:models';

Meteor.methods({
	readMessages(rid, messageId) {
		check(rid, String);

		const userId = Meteor.userId();

		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'readMessages',
			});
		}

		callbacks.run('beforeReadMessages', rid, userId);

		// TODO: move this calls to an exported function
		const userSubscription = Subscriptions.findOneByRoomIdAndUserId(rid, userId, { fields: { ls: 1, lmServerId: 1 } });
		if (userSubscription) {
			let fromSrvId; let tillSrvId;
			if (messageId) {
				const originalMessage = Messages.findOneById(messageId, {});
				if (!originalMessage) {
					throw new Meteor.Error('error-invalid-message', 'Invalid message', {
						method: 'readMessages',
					});
				}
				if (originalMessage.serverId) {
					tillSrvId = originalMessage.serverId;
				} else {
					tillSrvId = Messages.find({ rid, ts: { $lte: originalMessage.ts } }).count();
				}
			} else {
				const room = Rooms.findOneById(rid, { lm: 1, lastMessage: 1 });
				const { lastMessage } = room;
				if (!lastMessage) {
					return Subscriptions.setAsReadByRoomIdAndUserId(rid, userId);
				}

				if (lastMessage.serverId) {
					tillSrvId = lastMessage.serverId;
				} else {
					tillSrvId = Messages.find({ rid, ts: { $lte: lastMessage.ts } }).count();
				}
			}

			if (userSubscription.lmServerId) {
				fromSrvId = userSubscription.lmServerId;
			} else {
				fromSrvId = Messages.find({ rid, ts: { $lte: userSubscription.ls } }).count();
			}

			if (tillSrvId >= fromSrvId) {
				Subscriptions.setAsReadByRoomIdAndUserId(rid, userId, tillSrvId);
				Rooms.setLastMessageRead(rid, tillSrvId);
				Messages.setAsRead(rid, fromSrvId, tillSrvId);
			} else {
				console.warn('readMessages unknow error: params [', rid, userId, ']; counters: [', tillSrvId, fromSrvId, ']');
				Subscriptions.setAsReadByRoomIdAndUserId(rid, userId, fromSrvId);
				Rooms.setLastMessageRead(rid, fromSrvId);
				Messages.setAsRead(rid, fromSrvId, fromSrvId);
			}
		} else {
			console.warn('readMessages called by user without subscription: params [', rid, userId, ']');
		}
	},
});
