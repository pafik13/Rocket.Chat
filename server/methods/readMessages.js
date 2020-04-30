import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { Subscriptions, Rooms, Messages } from 'meteor/rocketchat:models';

Meteor.methods({
	readMessages(rid) {
		check(rid, String);

		const userId = Meteor.userId();

		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'readMessages',
			});
		}

		callbacks.run('beforeReadMessages', rid, userId);

		// TODO: move this calls to an exported function
		const userSubscription = Subscriptions.findOneByRoomIdAndUserId(rid, userId, { fields: { ls: 1 } });
		if (userSubscription) {
			const room = Rooms.findOneById(rid, { lm: 1 });
			if (room.lm.serverId > userSubscription.lmServerId) {
				Subscriptions.setAsReadByRoomIdAndUserId(rid, userId, room.lm.serverId);
				Rooms.setLastMessageRead(rid, userId);
				Messages.setAsRead(rid, userSubscription.lmServerId, room.lm.serverId);
			}
		} else {
			console.warn('readMessages called by user without subscription: params [', rid, userId, ']');
		}
	},
});
