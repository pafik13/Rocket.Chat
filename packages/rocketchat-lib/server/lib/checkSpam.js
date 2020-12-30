import { Meteor } from 'meteor/meteor';
import { JaroWinklerDistance as calcJWDistance } from 'natural';
import moment from 'moment';

import { Users } from 'meteor/rocketchat:models';
import { settings } from 'meteor/rocketchat:settings';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { ExtASCIIFolder } from 'meteor/rocketchat:extasciifolder';
import { redis } from './redis';
import { Logger } from 'meteor/rocketchat:logger';
const logger = new Logger('checkSpam');

callbacks.add('beforeSaveMessage', function(message) {
	logger.debug('beforeSaveMessage is called', message.msg, message.u);

	if (message.msg.length < 10) { return message; }
	if (!message.u || !message.u._id) { return message; }
	if (settings.get('Message_SpamCheckerIsEnabled')) {
		const user = message.u;
		const spamSetLength = settings.get('Message_SpamSetLength');
		const spamMaxCount = settings.get('Message_SpamMaxCount');
		const spamJWThreshold = settings.get('Message_SpamJWThresholdPct') / 100 || 1;
		const spamDeacivatePeriodInSecs = settings.get('Message_SpamDeacivationPeriodInSecs');
		const spamPeriodForAnalizeInHours = settings.get('Message_SpamPeriodForAnalizeInHours');

		logger.log('checkSpam', spamSetLength, spamMaxCount, spamJWThreshold, spamDeacivatePeriodInSecs);

		const redisKey = `spam::${ user._id }`;
		const lastMessagesFromRedis = Promise.await(redis.get(redisKey));
		logger.log('lastMessagesFromRedis', lastMessagesFromRedis);

		const normalizedMsg = ExtASCIIFolder.foldMaintaining(message.msg).toLowerCase();
		let lastMessages;
		if (!lastMessagesFromRedis) {
			lastMessages = [
				{
					msg: normalizedMsg, ts: message.ts, count: 1,
				},
			];
		} else {
			let isMatched = false;
			lastMessages = JSON.parse(lastMessagesFromRedis);
			for (const lastMessage of lastMessages) {
				const jwDistance = calcJWDistance(lastMessage.msg, normalizedMsg);
				logger.log('lastMessage.msg', lastMessage.msg);
				logger.log('normalizedMsg', normalizedMsg);
				logger.log('jwDistance', jwDistance);
				lastMessage.ts = new Date(lastMessage.ts);
				const tsDiff = Math.abs(moment(lastMessage.ts).diff());
				logger.log('tsDiff', tsDiff);
				if (tsDiff < spamPeriodForAnalizeInHours * 3600 * 1000 && jwDistance > spamJWThreshold) { lastMessage.count++; isMatched = true; }
				if (lastMessage.count >= spamMaxCount) {
					const admins = Users.findUsersInRoles('admin').fetch();
					const admin = admins[0];
					if (!admin) { return; }

					Meteor.runAsUser(admin._id, () => {
						Meteor.call('deactivateUserForPeriod', user._id, spamDeacivatePeriodInSecs, 'spam');
					});
				}
			}
			if (!isMatched) {
				lastMessages.push(
					{
						msg: normalizedMsg, ts: message.ts, count: 1,
					},
				);
			}
		}

		const lastMessagesToRedis = JSON.stringify(lastMessages.sort((a, b) => b.ts - a.ts).splice(0, spamSetLength));
		logger.log('lastMessagesToRedis', lastMessagesToRedis);
		Promise.await(redis.set(redisKey, lastMessagesToRedis));
	}

	return message;

}, 1, 'checkSpam');
