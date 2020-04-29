import { Random } from 'meteor/random';
import { Push } from 'meteor/rocketchat:push';
import { settings } from 'meteor/rocketchat:settings';
import { metrics } from 'meteor/rocketchat:metrics';
import { RocketChatAssets } from 'meteor/rocketchat:assets';
import { SystemLogger } from 'meteor/rocketchat:logger';

export class PushNotification {
	getNotificationId(roomId) {
		const serverId = settings.get('uniqueID');
		return this.hash(`${ serverId }|${ roomId }`); // hash
	}

	hash(str) {
		let hash = 0;
		let i = str.length;

		while (i) {
			hash = ((hash << 5) - hash) + str.charCodeAt(--i);
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash;
	}

	send({ roomName, roomId, username, message, usersTo, payload, badge = 1, category }) {
		SystemLogger.log('PushNotification:message_in', message);
		// message = message.replace(/^\[.+\) /g, '');
		message = message.replace(/\[ \]\(https:\/\/chat\.apianon\.ru\/(d|c|g|p|channel|direct|group|private|public)\/(.)+\)/gm, '');
		SystemLogger.log('PushNotification:message_re', message);

		let title;
		if (roomName && roomName !== '') {
			title = `${ roomName }`;
			message = `${ username }: ${ message }`;
		} else {
			title = `${ username }`;
		}

		const config = {
			from: `${ Random.id() }`,
			badge,
			sound: 'default',
			title,
			text: message,
			payload,
			query: usersTo,
			notId: this.getNotificationId(roomId),
			gcm: {
				style: 'inbox',
				summaryText: '%n% new messages',
				image: RocketChatAssets.getURL('Assets_favicon_192'),
			},
		};

		if (category !== '') {
			config.apn = {
				category,
			};
		}

		SystemLogger.log('PushNotification:config', config);

		metrics.notificationsSent.inc({ notification_type: 'mobile' });
		return Push.send(config);
	}
}

export default new PushNotification();
