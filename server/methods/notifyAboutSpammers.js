import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { Users } from 'meteor/rocketchat:models';
import { settings } from 'meteor/rocketchat:settings';
import { isLeader } from 'meteor/rocketchat:lib';

import { Logger } from 'meteor/rocketchat:logger';
const logger = new Logger('notifyAboutSpammers');

let notifyAboutSpammersURL;
settings.get('API_Notify_About_Spammer_URL', (key, value) => {
	logger.debug(key, value);
	try {
		const url = new URL(value);
		notifyAboutSpammersURL = url.toString();
	} catch (err) {
		notifyAboutSpammersURL = '';
		logger.error('notifyAboutSpammersURL Error:', err);
	}
});

let notifyAboutSpammersAuthToken;
settings.get('API_Notify_About_Spammer_Auth_Token', (key, value) => {
	logger.debug(key, value);
	notifyAboutSpammersAuthToken = value;
});

Meteor.methods({
	notifyAboutSpammers(from, till) {
		if (Promise.await(isLeader())) {
			const users = Users.findSpammersBetweenDates(from, till).fetch();
			const userAnonymIds = [];
			for (const user of users) {
				if (user.customFields && notifyAboutSpammersURL) {
					const { anonym_id: anonymId } = user.customFields;
					if (anonymId) {
						userAnonymIds.push(anonymId);
					} else {
						logger.error(`notifyAboutSpammers error: user with empty anonym_id, id=${ user._id }`);
					}
				}
			}

			const data = { userIds: userAnonymIds };
			logger.debug(notifyAboutSpammersURL, data);
			if (notifyAboutSpammersURL && notifyAboutSpammersAuthToken && userAnonymIds.length) {
				try {
					const result = HTTP.call('POST', notifyAboutSpammersURL, { data, timeout: 1000, headers: { Authorization: notifyAboutSpammersAuthToken } });
					logger.log('notifyAboutSpammers http result:', result);
				} catch (err) {
					logger.error('notifyAboutSpammers http Error:', err);
				}
			}
			return true;
		}
	},
});
