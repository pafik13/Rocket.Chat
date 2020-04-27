import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { InstanceStatus } from 'meteor/konecty:multiple-instances-status';
import { EventEmitter } from 'events';
import NATS from 'nats';

const instanceId = InstanceStatus.id() || Random.id();

const isDebug = !!process.env.NATS_DEBUG;

const logger = {
	error: console.error,
	info: console.info,
	debug: (...args) => {
		if (isDebug) {
			console.info(...args);
		}
	},
};
const ev = new EventEmitter();

// || 'nats://localhost:4222, nats://localhost:4223, nats://localhost:4224'
const isUseNats = !!process.env.NATS_SERVERS;
const natsServers = isUseNats ? process.env.NATS_SERVERS.split(',').map((it) => it.trim()) : [];

const client = isUseNats ? NATS.connect({ servers: natsServers, json: true }) : null;

const addConnectCallback = (nc, l) => {
	nc.on('connect', () => {
		l.info(`NATS connected to ${ nc.currentServer.url.host }`);
		nc.on('error', (err) => {
			l.error(err);
		});
	});
};

const addSubscription = (nc, l, e, s) => {
	nc.subscribe(s, Meteor.bindEnvironment((msg, reply, subject, sid) => {
		l.debug('received', s, subject, msg);
		if (!isUseNats) { return; }
		if (msg.instanceId !== instanceId) {
			e.emit(s, msg, reply, subject, sid);
			l.debug('emitted', s, subject, msg);
		}
	}));
};

if (client) { addConnectCallback(client, logger); }

const publish = (topic, msg) => {
	if (!isUseNats) { return; }
	if (typeof msg !== 'object' || msg === null) {
		logger.error('publish', topic, msg);
	}
	msg.nats = true;
	msg.instanceId = instanceId;
	logger.debug('publish', topic, msg);
	client.publish(topic, msg);
};

const subscribe = (sub, cb) => {
	ev.on(sub, cb);
	if (!isUseNats) { return; }
	addSubscription(client, logger, ev, sub);
};

export const nats = {
	publish,
	subscribe,
	isDebug,
};
