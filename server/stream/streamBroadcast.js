import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Logger } from 'meteor/rocketchat:logger';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { nats } from 'meteor/rocketchat:models';

process.env.PORT = String(process.env.PORT).trim();
process.env.INSTANCE_IP = String(process.env.INSTANCE_IP).trim();

const connections = {};
this.connections = connections;

const logger = new Logger('StreamBroadcast', {
	sections: {
		receive: 'Receive',
		method: 'Method',
		broadcast: 'Broadcast',
		emit: 'Emit',
	},
});

logger.info(nats);

Meteor.methods({
	broadcastAuth(remoteId, selfId) {
		logger.method.info('broadcastAuth', remoteId, selfId);

		check(selfId, String);
		check(remoteId, String);

		this.unblock();

		return true;
	},

	stream(streamName, eventName, args) {
		logger.method.info('stream', streamName, eventName, args);

		nats.publish(`stream.${ streamName }`, { eventName, args });
	},

	'instances/get'() {
		logger.method.info('instances/get');

		if (!hasPermission(Meteor.userId(), 'view-statistics')) {
			throw new Meteor.Error('error-action-not-allowed', 'List instances is not allowed', {
				method: 'instances/get',
			});
		}

		return [];
	},
});


function startStreamBroadcast() {
	logger.info('startStreamBroadcast');

	nats.subscribe('stream.*', (msg, reply, subject, sid) => {
		logger.receive.info(msg, reply, subject, sid);

		const streamName = subject.split('.')[1];
		const { eventName, args } = msg;

		if (!streamName || !eventName || !args) {
			logger.receive.error(msg, subject);
			return;
		}

		const instance = Meteor.StreamerCentral.instances[streamName];
		if (!instance) {
			logger.receive.error('stream-not-exists', msg, subject);
			return 'stream-not-exists';
		}

		if (instance.serverOnly) {
			const scope = {};
			instance.emitWithScope(eventName, scope, ...args);
		} else {
			instance._emit(eventName, args);
		}
		logger.emit.info(streamName, eventName, args);
	});

	function broadcast(streamName, eventName, args/* , userId*/) {
		logger.broadcast.info(streamName, eventName, args);
		nats.publish(`stream.${ streamName }`, { eventName, args });
	}

	return Meteor.StreamerCentral.on('broadcast', function(streamName, eventName, args) {
		return broadcast(streamName, eventName, args);
	});
}

Meteor.startup(function() {
	return startStreamBroadcast();
});
