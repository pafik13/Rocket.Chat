import IORedis from 'ioredis';
import { settings } from 'meteor/rocketchat:settings';
import { Logger } from 'meteor/rocketchat:logger';
const logger = new Logger('redis', {});

let isUseRedis = false ;// settings.get('Use_redis');
let redisHost = settings.get('Redis_host') || 'localhost';
let redisPort = settings.get('Redis_port') || 6379;

let client = isUseRedis ? new IORedis({ host: redisHost, port: redisPort }) : null;

settings.get('Use_redis', (key, value) => {
	logger.debug(key, value);
	isUseRedis = value;
	if (isUseRedis) {
		try {
			if (client) { client.disconnect(); }
			client = new IORedis({ host: redisHost, port: redisPort });
		} catch (err) {
			client = null;
			isUseRedis = false;
			logger.error(err);
		}
	} else {
		if (client) { client.disconnect(); }
		client = null;
	}
});

settings.get('Redis_host', (key, value) => {
	logger.debug(key, value);
	try {
		if (client) { client.disconnect(); }
		redisHost = value || 'localhost';
		if (isUseRedis) {
			client = new IORedis({ host: redisHost, port: redisPort });
		}
	} catch (err) {
		client = null;
		isUseRedis = false;
		logger.error(err);
	}
});

settings.get('Redis_port', (key, value) => {
	logger.debug(key, value);
	try {
		if (client) { client.disconnect(); }
		redisPort = value || 6379;
		if (isUseRedis) {
			client = new IORedis({ host: redisHost, port: redisPort });
		}
	} catch (err) {
		client = null;
		isUseRedis = false;
		logger.error(err);
	}
});

const info = async() => {
	const result = await client.info();
	logger.debug('info', result);
	return result;
};

const incr = async(key) => {
	if (!isUseRedis) { return -1; }
	logger.debug('incr', key);
	const result = await client.incr(key);
	logger.debug('incr', key, result);
	return result;
};

const get = async(key) => {
	if (!isUseRedis) { return null; }
	logger.debug('get', key);
	const result = await client.get(key);
	logger.debug('get', key, result);
	return result;
};

const set = async(key, value) => {
	if (!isUseRedis) { return 'OK'; }
	logger.debug('set', key, value);
	const result = await client.set(key, value);
	logger.debug('set', key, value, result);
	return result;
};

export const redis = {
	info,
	client,
	incr,
	get,
	set,
};
