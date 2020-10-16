import { Meteor } from 'meteor/meteor';
import { settings } from 'meteor/rocketchat:settings';
import { nats } from 'meteor/rocketchat:models';
import { roomTypes } from 'meteor/rocketchat:utils';
import { RocketChatAssets } from 'meteor/rocketchat:assets';
import { getURL } from 'meteor/rocketchat:utils';
import s from 'underscore.string';

const natsQueue = process.env.NATS_QUEUE || 'notifications';

export function sendSinglePush({ notificationMessage, room, message, sender }) {

	const url = getURL('', { cdn: true, full: true });
	const regexString = `\\[ \\]\\(${ s.escapeRegExp(url) }(d|c|g|p|channel|direct|group|private|public\\/)(.)+\\) `;
	const answerRE = new RegExp(regexString, 'gm');

	const { _id, username, name, customFields } = sender;

	nats.publish(natsQueue, {
		roomId: room._id,
		roomType: room.t,
		roomName: settings.get('Push_show_username_room') && room.t !== 'd' ? `#${ roomTypes.getRoomName(room.t, room) }` : '',
		sender: { _id, username, name, customFields },
		image: RocketChatAssets.getURL('Assets_favicon_192'),
		messageId: message._id,
		messageType: message.t,
		host: Meteor.absoluteUrl(),
		notificationMessage: settings.get('Push_show_message') ? notificationMessage.replace(answerRE, '') : ' ',
	});
}
