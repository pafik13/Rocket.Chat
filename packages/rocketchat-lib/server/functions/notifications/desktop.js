import { metrics } from 'meteor/rocketchat:metrics';
import { settings } from 'meteor/rocketchat:settings';
import { Notifications } from 'meteor/rocketchat:notifications';
import { roomTypes } from 'meteor/rocketchat:utils';
/**
 * Send notification to user
 *
 * @param {string} userId The user to notify
 * @param {object} user The sender
 * @param {object} room The room send from
 * @param {object} message The message object
 * @param {number} duration Duration of notification
 * @param {string} notificationMessage The message text to send on notification body
 */
export function notifyDesktopUser({
	userId,
	user,
	message,
	room,
	duration,
	notificationMessage,
}) {
	const { title, text } = roomTypes.getConfig(room.t).getNotificationDetails(room, user, notificationMessage);

	metrics.notificationsSent.inc({ notification_type: 'desktop' });
	Notifications.notifyUser(userId, 'notification', {
		title,
		text,
		duration,
		payload: {
			_id: message._id,
			rid: message.rid,
			sender: message.u,
			type: room.t,
			name: room.name,
			message: {
				msg: message.msg,
				t: message.t,
			},
		},
	});
}

export function shouldNotifyDesktop({
	disableAllMessageNotifications,
	status,
	isSubscribedOnNotifications,
	desktopNotifications,
	hasMentionToAll,
	hasMentionToHere,
	isHighlighted,
	hasMentionToUser,
	roomType,
}) {
	if (disableAllMessageNotifications && desktopNotifications == null && !isHighlighted && !hasMentionToUser) {
		return false;
	}

	if (!isSubscribedOnNotifications || status === 'busy' || desktopNotifications === 'nothing') {
		return false;
	}

	if (!desktopNotifications) {
		const roomTypeName = roomTypes.getRoomTypeName(roomType);
		const settingKey = `Accounts_Default_User_Preferences_desktopNotifications${ roomTypeName }`;
		const settingVal = settings.get(settingKey);
		if (settingVal === 'all') {
			return true;
		}
		if (settingVal === 'nothing') {
			return false;
		}
	}

	return roomType === 'd' || (!disableAllMessageNotifications && (hasMentionToAll || hasMentionToHere)) || isHighlighted || desktopNotifications === 'all' || hasMentionToUser;
}
