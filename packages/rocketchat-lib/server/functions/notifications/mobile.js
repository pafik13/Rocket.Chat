import { Meteor } from 'meteor/meteor';
import { settings } from 'meteor/rocketchat:settings';
import { nats } from 'meteor/rocketchat:models';
import { roomTypes } from 'meteor/rocketchat:utils';

export function sendSinglePush({ notificationMessage, room, message }) {

	nats.publish('notification', {
		roomId: room._id,
		roomType: room.t,
		roomName: settings.get('Push_show_username_room') && room.t !== 'd' ? `#${ roomTypes.getRoomName(room.t, room) }` : '',
		messageId: message._id,
		host: Meteor.absoluteUrl(),
		notificationMessage: settings.get('Push_show_message') ? notificationMessage : ' ',
	});
}
