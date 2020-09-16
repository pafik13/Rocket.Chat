import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { InstanceStatus } from 'meteor/konecty:multiple-instances-status';
import { UserPresence } from 'meteor/konecty:user-presence';
import { UserPresenceMonitor } from 'meteor/konecty:user-presence';
import { settings } from 'meteor/rocketchat:settings';
import { Logger } from 'meteor/rocketchat:logger';
const logger = new Logger('Presence');

const instances = [];
let isLeader = true;

let ingestURL;
settings.get('Main_backend_host', (key, value) => {
	logger.debug(key, value);
	try {
		const mainBackendHost = new URL(value);
		mainBackendHost.pathname = '/auth/ingest';
		ingestURL = mainBackendHost.toString();
	} catch (err) {
		ingestURL = '';
		logger.error('ingestURL Error:', err);
	}
});

const handler = (user, status, statusConnection) => {
	if (isLeader)	{
		logger.log('UserPresenceMonitor:', user, status, statusConnection);
		if (user.customFields && ingestURL) {
			const method = statusConnection === 'online' ? 'setOnline' : 'setOffline';
			const data = { method, params: [user.customFields.anonym_id] };
			logger.debug(ingestURL, data);
			try {
				const result = HTTP.call('POST', ingestURL, { data, timeout: 1000 });
				logger.log('Auth Ingest Result:', result);
			} catch (err) {
				logger.error('Auth Ingest Error:', err);
			}
		}

		Meteor.users.update(user._id, { $set: { isSubscribedOnNotifications: false } });
	}
};

Meteor.startup(function() {
	const instance = {
		host: 'localhost',
		port: String(process.env.PORT).trim(),
	};

	if (process.env.INSTANCE_IP) {
		instance.host = String(process.env.INSTANCE_IP).trim();
	}

	InstanceStatus.registerInstance('rocket.chat', instance);

	UserPresence.start();

	const startMonitor = typeof process.env.DISABLE_PRESENCE_MONITOR === 'undefined' ||
		!['true', 'yes'].includes(String(process.env.DISABLE_PRESENCE_MONITOR).toLowerCase());
	if (startMonitor) {
		UserPresenceMonitor.start();
		UserPresenceMonitor.onSetUserStatus(handler);
	}

	InstanceStatus.getCollection().find({}).observeChanges({
		added(id) {
			logger.log('New Instance:', id);
			instances.push(id);
			instances.sort();
			isLeader = instances[0] === InstanceStatus.id();
			logger.log('isLeader:', isLeader);
		},
		removed(id) {
			logger.log('Deleted Instance:', id);
			const index = instances.indexOf(id);
			if (index > -1) {
				instances.splice(index, 1);
			}
			instances.sort();
			isLeader = instances[0] === InstanceStatus.id();
			logger.log('isLeader:', isLeader);
		},
	});
});
