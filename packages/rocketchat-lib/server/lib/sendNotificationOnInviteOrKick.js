import { TAPi18n } from 'meteor/tap:i18n';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { Subscriptions, Messages } from 'meteor/rocketchat:models';
import { Logger } from 'meteor/rocketchat:logger';
const logger = new Logger('sendNotificationOnInviteOrKick');

import { sendNotification } from './sendNotificationsOnMessage';

const project = {
	$project: {
		audioNotifications: 1,
		desktopNotificationDuration: 1,
		desktopNotifications: 1,
		emailNotifications: 1,
		mobilePushNotifications: 1,
		muteGroupMentions: 1,
		name: 1,
		userHighlights: 1,
		'u._id': 1,
		'receiver.active': 1,
		'receiver.emails': 1,
		'receiver.language': 1,
		'receiver.status': 1,
		'receiver.isSubscribedOnNotifications': 1,
		'receiver.username': 1,
	},
};

const filter = {
	$match: {
		'receiver.active': true,
	},
};

const lookup = {
	$lookup: {
		from: 'users',
		localField: 'u._id',
		foreignField: '_id',
		as: 'receiver',
	},
};

async function notifyUser(subscriptionId, sender, message, room) {
	const mentionIds = [];
	const hasMentionToAll = false;
	const hasMentionToHere = false;

	const disableAllMessageNotifications = false;

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
		const userLng = subscription.receiver.language;
		const room_type_name = room.t === 'c' ? TAPi18n.__('channel', {}, userLng) : TAPi18n.__('group', {}, userLng);
		await sendNotification({
			subscription,
			sender,
			hasMentionToAll,
			hasMentionToHere,
			message,
			notificationMessage: TAPi18n.__('You_are_invited_to_room', { room_type_name }, userLng),
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

callbacks.add('afterCreateRoom', async(room, { owner, subs }) => {
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
	return room;
});

export { notifyUser };
