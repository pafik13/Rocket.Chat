import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Random } from 'meteor/random';
import { TAPi18n } from 'meteor/tap:i18n';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { metrics } from 'meteor/rocketchat:metrics';
import { settings } from 'meteor/rocketchat:settings';
import { Notifications } from 'meteor/rocketchat:notifications';
import { messageProperties } from 'meteor/rocketchat:ui-utils';
import { Subscriptions, Users } from 'meteor/rocketchat:models';
import { sendMessage } from '../functions';
import { RateLimiter } from '../lib';
import moment from 'moment';

Meteor.methods({
	sendMessage(message) {
		check(message, Object);
		const callerId = Meteor.userId();

		if (!callerId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'sendMessage',
			});
		}

		if (!message.rid) {
			throw new Error('The \'rid\' property on the message object is missing.');
		}

		if (message.ts) {
			const tsDiff = Math.abs(moment(message.ts).diff());
			if (tsDiff > 60000) {
				throw new Meteor.Error('error-message-ts-out-of-sync', 'Message timestamp is out of sync', {
					method: 'sendMessage',
					message_ts: message.ts,
					server_ts: new Date().getTime(),
				});
			} else if (tsDiff > 10000) {
				message.ts = new Date();
			}
		} else {
			message.ts = new Date();
		}

		if (message.msg) {
			const adjustedMessage = messageProperties.messageWithoutEmojiShortnames(message.msg);

			if (messageProperties.length(adjustedMessage) > settings.get('Message_MaxAllowedSize')) {
				throw new Meteor.Error('error-message-size-exceeded', 'Message size exceeds Message_MaxAllowedSize', {
					method: 'sendMessage',
				});
			}
		}

		const user = Users.findOneById(callerId, {
			fields: {
				active: 1,
				username: 1,
				name: 1,
				deactivatedUntil: 1,
				language: 1,
			},
		});

		const userLanguage = (user && user.language) || settings.get('Language') || 'en';

		if (user.deactivatedUntil) {
			const datetime = moment(user.deactivatedUntil).locale(userLanguage).format('LLL');

			throw new Meteor.Error('error-user-deactivated', TAPi18n.__('You_cant_send_message_because_deactivated_until', { until: datetime }, userLanguage), {
				method: 'sendMessage',
			});
		}

		if (!user.active) {
			throw new Meteor.Error('error-user-deactivated', TAPi18n.__('You_cant_send_message_because_deactivated', {}, userLanguage), {
				method: 'validateFileUpload',
			});
		}

		const isBanned = Meteor.call('isUserBanned', { rid: message.rid, username: user.username });

		if (isBanned) {
			throw new Meteor.Error('error-user-banned', 'You can\'t send messages because you are banned', {
				method: 'sendMessage',
			});
		}

		const room = Meteor.call('canAccessRoom', message.rid, user._id);
		if (!room) {
			return false;
		}

		const subscription = Subscriptions.findOneByRoomIdAndUserId(message.rid, callerId);
		if (!subscription) {
			Notifications.notifyUser(callerId, 'message', {
				_id: Random.id(),
				rid: room._id,
				ts: new Date,
				msg: TAPi18n.__('error-logged-user-not-in-room', {
					postProcess: 'sprintf',
					sprintf: [room.name],
				}, user.language),
			});
			throw new Meteor.Error('You can\'t send messages because you are not in room');
		} else if (subscription.blocked || subscription.blocker) {
			Notifications.notifyUser(callerId, 'message', {
				_id: Random.id(),
				rid: room._id,
				ts: new Date,
				msg: TAPi18n.__('room_is_blocked', {}, user.language),
			});
			throw new Meteor.Error('You can\'t send messages because you are blocked');
		}

		if ((room.muted || []).includes(user.username)) {
			Notifications.notifyUser(callerId, 'message', {
				_id: Random.id(),
				rid: room._id,
				ts: new Date,
				msg: TAPi18n.__('You_have_been_muted', {}, user.language),
			});
			throw new Meteor.Error('You can\'t send messages because you have been muted');
		}

		if (message.alias == null && settings.get('Message_SetNameToAliasEnabled')) {
			message.alias = user.name;
		}

		metrics.messagesSent.inc(); // TODO This line needs to be moved to it's proper place. See the comments on: https://github.com/RocketChat/Rocket.Chat/pull/5736
		return sendMessage(user, message, room);
	},
});
// Limit a user, who does not have the "bot" role, to sending 5 msgs/second
RateLimiter.limitMethod('sendMessage', 5, 1000, {
	userId(userId) {
		return !hasPermission(userId, 'send-many-messages');
	},
});
