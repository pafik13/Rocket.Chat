import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { callbacks } from 'meteor/rocketchat:callbacks';
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

const onSetUserStatusHandler = (user, status, statusConnection) => {
	if (isLeader)	{
		logger.log('UserPresenceMonitor:', user, status, statusConnection);
		if (user.customFields && ingestURL) {
			const { anonym_id: anonymId } = user.customFields;
			if (anonymId) {
				const method = statusConnection === 'online' ? 'setOnline' : 'setOffline';
				const data = { method, params: [user.customFields.anonym_id] };
				logger.debug(ingestURL, data);
				try {
					const result = HTTP.call('POST', ingestURL, { data, timeout: 1000 });
					logger.log('onSetUserStatusHandler http result:', result);
				} catch (err) {
					logger.error('onSetUserStatusHandler http Error:', err);
				}
			} else {
				logger.error(`onSetUserStatusHandler error: user with empty anonym_id, id=${ user._id }`);
			}
		}
		const now = new Date();
		if (statusConnection === 'offline') {
			Meteor.users.update(user._id, { $set: { isSubscribedOnNotifications: false, 'customFields.lastTime': user.statusDefault === 'offline' ? null : now, lastTimeConnection: now } });
		} else {
			// For Android and status `away`
			Meteor.users.update(user._id, { $set: { isSubscribedOnNotifications: status === 'online' } });
		}
	}
};

const afterCreateDirectRoomHandler = (room, { from, to }) => {
	if (isLeader)	{
		logger.log('afterCreateDirectRoomHandler:', room, from, to);
		if (from.customFields && to.customFields && ingestURL) {
			const { anonym_id: fromAnonymId } = from.customFields;
			const { anonym_id: toAnonymId } = to.customFields;
			if (fromAnonymId && toAnonymId) {
				const data = { method: 'dialogCreated', params: [fromAnonymId, toAnonymId] };
				logger.debug(ingestURL, data);
				try {
					const result = HTTP.call('POST', ingestURL, { data, timeout: 1000 });
					logger.log('afterCreateDirectRoomHandler http result:', result);
				} catch (err) {
					logger.error('afterCreateDirectRoomHandler error:', err);
				}
			} else {
				if (!fromAnonymId) { logger.error(`afterCreateDirectRoomHandler error: from with empty anonym_id, id=${ from._id }`); }
				if (!toAnonymId) { logger.error(`afterCreateDirectRoomHandler error: to with empty anonym_id, id=${ to._id }`); }
			}
		}
	}
};

Meteor.startup(function() {
	callbacks.add('afterCreateDirectRoom', afterCreateDirectRoomHandler, callbacks.priority.LOW, 'ingest-create-direct-room');

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
		UserPresenceMonitor.onSetUserStatus(onSetUserStatusHandler);
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
