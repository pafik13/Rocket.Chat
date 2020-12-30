import { Meteor } from 'meteor/meteor';
import moment from 'moment';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { settings } from 'meteor/rocketchat:settings';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { Subscriptions, Users } from 'meteor/rocketchat:models';
import { roomTypes } from 'meteor/rocketchat:utils';
import { callJoinRoom, parseMessageTextPerUser, replaceMentionedUsernamesWithFullNames } from '../functions/notifications/';
import { sendPushNotifications, Events } from '../functions/notifications/mobile';
import { notifyDesktopUser, shouldNotifyDesktop } from '../functions/notifications/desktop';
import { notifyAudioUser, shouldNotifyAudio } from '../functions/notifications/audio';

const sendNotification = async({
	subscription,
	sender,
	hasMentionToAll,
	hasMentionToHere,
	message,
	notificationMessage,
	room,
	mentionIds,
	disableAllMessageNotifications,
}) => {

	// don't notify the sender
	if (subscription.u._id === sender._id) {
		return;
	}

	const hasMentionToUser = mentionIds.includes(subscription.u._id);

	const receiver = subscription.receiver ? subscription.receiver[0] : subscription.u;

	const roomType = room.t;
	// If the user doesn't have permission to view direct messages, don't send notification of direct messages.
	if (roomType === 'd' && !hasPermission(subscription.u._id, 'view-d-room')) {
		return;
	}

	notificationMessage = parseMessageTextPerUser(notificationMessage, message, receiver);

	const isHighlighted = false;

	const {
		audioNotifications,
		desktopNotifications,
	} = subscription;

	console.log('sendNotification', subscription, receiver);

	// busy users don't receive audio notification
	if (shouldNotifyAudio({
		disableAllMessageNotifications,
		status: receiver.status,
		isSubscribedOnNotifications: receiver.isSubscribedOnNotifications,
		audioNotifications,
		hasMentionToAll,
		hasMentionToHere,
		isHighlighted,
		hasMentionToUser,
		roomType,
	})) {
		notifyAudioUser(subscription.u._id, message, room);
	}

	// busy users don't receive desktop notification
	if (shouldNotifyDesktop({
		disableAllMessageNotifications,
		status: receiver.status,
		isSubscribedOnNotifications: receiver.isSubscribedOnNotifications,
		desktopNotifications,
		hasMentionToAll,
		hasMentionToHere,
		isHighlighted,
		hasMentionToUser,
		roomType,
	})) {
		notifyDesktopUser({
			notificationMessage,
			userId: subscription.u._id,
			user: sender,
			message,
			room,
			duration: subscription.desktopNotificationDuration,
		});
	}
};

async function sendAllNotifications(message, room) {

	// skips this callback if the message was edited
	if (message.editedAt) {
		return message;
	}

	if (message.ts && Math.abs(moment(message.ts).diff()) > 60000) {
		return message;
	}

	if (!room || room.t == null) {
		return message;
	}

	const sender = roomTypes.getConfig(room.t).getMsgSender(message.u._id);
	if (!sender) {
		return message;
	}

	const mentionIds = (message.mentions || []).map(({ _id }) => _id);
	const mentionIdsWithoutGroups = mentionIds.filter((_id) => _id !== 'all' && _id !== 'here');
	const hasMentionToAll = false;
	const hasMentionToHere = false;

	let notificationMessage = callbacks.run('beforeSendMessageNotifications', message.msg);
	if (mentionIds.length > 0 && settings.get('UI_Use_Real_Name')) {
		notificationMessage = replaceMentionedUsernamesWithFullNames(message.msg, message.mentions);
	}

	// Don't fetch all users if room exceeds max members
	const maxMembersForNotification = settings.get('Notifications_Max_Room_Members');
	let roomMembersCount = room.usersCount;
	if (!roomMembersCount) {
		roomMembersCount = Subscriptions.findByRoomId(room._id).count();
	}
	const disableAllMessageNotifications = roomMembersCount > maxMembersForNotification && maxMembersForNotification !== 0;

	if (disableAllMessageNotifications) { return; }

	sendPushNotifications({
		message,
		room,
		notificationMessage,
		sender,
		event: Events.MESSAGE,
	});

	const query = {
		'subscriptions.rid': room._id,
		'subscriptions.disableNotifications': { $ne: true },
		active: true,
		isSubscribedOnNotifications: true,
	};

	const options = {
		projection: {
			'subscriptions.$': 1,
			active: 1,
			language: 1,
			status: 1,
			isSubscribedOnNotifications: 1,
			username: 1,
		},
	};

	// console.log(query, options);

	// 	const timeToken = `notification::${ Random.id() }`;
	// 	console.time(timeToken);
	const cursor = Users.model.rawCollection().find(query, options);
	// let count = 0;
	while (await cursor.hasNext()) {
		// load one document from the resultset into memory
		const user = await cursor.next();
		const [subscription] = user.subscriptions;
		subscription.u = user;
		await sendNotification({
			subscription,
			sender,
			hasMentionToAll,
			hasMentionToHere,
			message,
			notificationMessage,
			room,
			mentionIds,
			disableAllMessageNotifications,
		});
		// 		count++;
	}
	// 	console.timeEnd(timeToken);
	// 	console.log(`${ timeToken }::count=${ count }`);

	// on public channels, if a mentioned user is not member of the channel yet, he will first join the channel and then be notified based on his preferences.
	if (room.t === 'c') {
		// get subscriptions from users already in room (to not send them a notification)
		const mentions = [...mentionIdsWithoutGroups];
		Subscriptions.findByRoomIdAndUserIds(room._id, mentionIdsWithoutGroups, { fields: { 'u._id': 1 } }).forEach((subscription) => {
			const index = mentions.indexOf(subscription.u._id);
			if (index !== -1) {
				mentions.splice(index, 1);
			}
		});

		Promise.all(mentions
			.map(async(userId) => {
				await callJoinRoom(userId, room._id);

				return userId;
			})
		).then((users) => {
			users.forEach((userId) => {
				const subscription = Subscriptions.findOneByRoomIdAndUserId(room._id, userId);

				sendNotification({
					subscription,
					sender,
					hasMentionToAll,
					hasMentionToHere,
					message,
					notificationMessage,
					room,
					mentionIds,
				});
			});
		}).catch((error) => {
			throw new Meteor.Error(error);
		});
	}

	return message;
}

callbacks.add('afterSaveMessage', (message, room) => Promise.await(sendAllNotifications(message, room)), callbacks.priority.LOW, 'sendNotificationsOnMessage');

export { sendNotification, sendAllNotifications, sendPushNotifications };
