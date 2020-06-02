import { MessageTypes } from 'meteor/rocketchat:ui-utils';
import { TAPi18n } from 'meteor/tap:i18n';
import { settings } from 'meteor/rocketchat:settings';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { Subscriptions, Messages } from 'meteor/rocketchat:models';
import { Logger } from 'meteor/rocketchat:logger';
const logger = new Logger('sendNotificationOnInviteOrKick');

import { sendNotification, project, lookup, filter } from './sendNotificationsOnMessage';

async function notifyUser(subscriptionId, sender, message, room) {
	const mentionIds = [];
	const hasMentionToAll = false;
	const hasMentionToHere = false;

	const messageType = MessageTypes.getType(message);
	const data = (typeof messageType.data === 'function' && messageType.data(message)) || {};

	// Don't fetch all users if room exceeds max members
	const maxMembersForNotification = settings.get('Notifications_Max_Room_Members');
	let roomMembersCount = room.usersCount;
	if (!roomMembersCount) {
		roomMembersCount = Subscriptions.findByRoomId(room._id).count();
	}
	const disableAllMessageNotifications = roomMembersCount > maxMembersForNotification && maxMembersForNotification !== 0;

	const query = {
		_id: subscriptionId,
	};

	// the find bellow is crucial. all subscription records returned will receive at least one kind of notification.
	// the query is defined by the server's default values and Notifications_Max_Room_Members setting.
	// 	const timeToken = `notification::${ Random.id() }`;
	// 	console.time(timeToken);
	const cursor = Subscriptions.model.rawCollection().aggregate([
		{ $match: query },
		lookup,
		filter,
		project,
	]);

	// 	let count = 0;
	while (await cursor.hasNext()) {
		// load one document from the resultset into memory
		const subscription = await cursor.next();
		logger.debug('subscription', subscription);
		await sendNotification({
			subscription,
			sender,
			hasMentionToAll,
			hasMentionToHere,
			message,
			notificationMessage: TAPi18n.__(messageType.message, data, subscription.receiver.language),
			room,
			mentionIds,
			disableAllMessageNotifications,
		});
		// 		count++;
	}
	// 	console.timeEnd(timeToken);
	// 	console.log(`${ timeToken }::count=${ count }`);

	return message;
}

callbacks.add('afterCreateRoom', async({ owner, room }, subs) => {
	logger.debug('afterCreateRoom', owner, room, subs);
	const now = new Date();
	if (subs && subs.length) {
		for (let i = 0; i < subs.length; i++) {
			const { user, subscription } = subs[i];
			let subId;
			if (subscription._id instanceof Promise) {
				subId = await subscription._id;
			} else {
				subId = subscription._id;
			}
			if (!subId) {
				logger.warn('afterCreateRoom without subId');
			}
			if (!user) {
				logger.warn('afterCreateRoom without user');
			}
			if (subId && user && owner) {
				try {
					if (owner._id !== user._id) {
						const msg = Messages.createUserAddedWithRoomIdAndUser(room._id, user, {
							ts: now,
							u: {
								_id: owner._id,
								username: owner.username,
							},
						});
						await notifyUser(subId, owner, msg, room);
						logger.debug('createUserAddedWithRoomIdAndUser', msg);
					}
				} catch (err) {
					logger.error(err);
				}
			}
		}
	}
});

export { notifyUser };
