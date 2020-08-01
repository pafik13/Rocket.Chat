import { Meteor } from 'meteor/meteor';
import { settings } from 'meteor/rocketchat:settings';
import { Subscriptions } from 'meteor/rocketchat:models';
import { roomTypes } from 'meteor/rocketchat:utils';
import { PushNotification } from 'meteor/rocketchat:push-notifications';

const CATEGORY_MESSAGE = 'MESSAGE';
const CATEGORY_MESSAGE_NOREPLY = 'MESSAGE_NOREPLY';

let alwaysNotifyMobileBoolean;
settings.get('Notifications_Always_Notify_Mobile', (key, value) => {
	alwaysNotifyMobileBoolean = value;
});

let SubscriptionRaw;
Meteor.startup(() => {
	SubscriptionRaw = Subscriptions.model.rawCollection();
});

async function getBadgeCount(userId) {
	const [result] = await SubscriptionRaw.aggregate([
		{ $match: { 'u._id': userId } },
		{
			$group: {
				_id: 'total',
				total: { $sum: '$unread' },
			},
		},
	]).toArray();

	const { total } = result;
	return total;
}

function canSendMessageToRoom(room, username) {
	return !((room.muted || []).includes(username));
}

export async function sendSinglePush({ room, message, userId, receiverUsername, senderUsername, senderName, notificationMessage }) {
	let username = '';
	if (settings.get('Push_show_username_room')) {
		username = settings.get('UI_Use_Real_Name') === true ? senderName : senderUsername;
	}

	PushNotification.send({
		roomId: message.rid,
		payload: {
			host: Meteor.absoluteUrl(),
			rid: message.rid,
			sender: message.u,
			type: room.t,
			name: room.name,
			messageType: message.t,
			messageId: message._id,
		},
		roomName: settings.get('Push_show_username_room') && room.t !== 'd' ? `#${ roomTypes.getRoomName(room.t, room) }` : '',
		username,
		message: settings.get('Push_show_message') ? notificationMessage : ' ',
		badge: await getBadgeCount(userId),
		userId,
		category: canSendMessageToRoom(room, receiverUsername) ? CATEGORY_MESSAGE : CATEGORY_MESSAGE_NOREPLY,
		pushType: message.t && message.t === 'p2p-call' ? 'voip' : 'alert',
	});
}

export function shouldNotifyMobile({
	disableAllMessageNotifications,
	mobilePushNotifications,
	hasMentionToAll,
	isHighlighted,
	hasMentionToUser,
	statusConnection,
	roomType,
}) {
	if (disableAllMessageNotifications && mobilePushNotifications == null && !isHighlighted && !hasMentionToUser) {
		return false;
	}

	if (mobilePushNotifications === 'nothing') {
		return false;
	}

	if (!alwaysNotifyMobileBoolean && statusConnection === 'online') {
		return false;
	}

	if (!mobilePushNotifications) {
		const roomTypeName = roomTypes.getRoomTypeName(roomType);
		const settingKey = `Accounts_Default_User_Preferences_mobileNotifications${ roomTypeName }`;
		const settingVal = settings.get(settingKey);
		if (settingVal === 'all') {
			return true;
		}
		if (settingVal === 'nothing') {
			return false;
		}
	}

	return roomType === 'd' || (!disableAllMessageNotifications && hasMentionToAll) || isHighlighted || mobilePushNotifications === 'all' || hasMentionToUser;
}
