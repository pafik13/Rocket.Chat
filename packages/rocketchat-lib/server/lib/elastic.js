import { Client } from '@elastic/elasticsearch';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { settings } from 'meteor/rocketchat:settings';
import { Logger } from 'meteor/rocketchat:logger';
const logger = new Logger('elastic', {});

let isUseElastic = settings.get('Use_elastic');
const elasticHost = settings.get('Elastic_host') || 'http://localhost:9200';

settings.get('Use_elastic', (key, value) => {
	logger.debug(key, value);
	isUseElastic = value;
});

let client = new Client({ node: elasticHost });

settings.get('Elastic_host', (key, value) => {
	logger.debug(key, value);
	try {
		client = new Client({ node: value });
		isUseElastic = settings.get('Use_elastic');
	} catch (err) {
		client = null;
		isUseElastic = false;
		logger.error(err);
	}
});

const indeces = async() => {
	const result = await client.cat.indices({ format: 'json' });
	return result;
};

/**
  @param {Subscription} sub
  @param {User} user
*/
const addSubscription = async(sub, user) => {
	if (!isUseElastic) { return; }
	logger.debug('addSubscription', sub, user);
	const doc = {
		roomId: sub.rid,
		userId: user._id,
		username: user.username,
		usernameAndName: `${ user.username } ${ user.name }`,
	};
	const result = await client.create({
		id: sub._id,
		index: 'subscription',
		body: doc,
		refresh: true,
	});
	return result;
};

/**
  @param {Subscription} sub
*/
const delSubscription = async(sub) => {
	if (!isUseElastic) { return; }
	logger.debug('delSubscription', sub);
	const result = await client.delete({
		id: sub._id,
		index: 'subscription',
		refresh: true,
	});
	return result;
};

/**
  @param {User} user
*/
const updateUser = async(user) => {
	if (!isUseElastic) { return; }
	logger.debug('updateUser', user);
	if (!user.username) {
		logger.warn('updateUser without username');
	}
	if (!user.name) {
		logger.warn('updateUser without name');
	}

	if (user.name && user.username) {
		const update = {
			query: {
				term: {
					userId: user._id,
				},
			},
			script: {
				source: 'ctx._source.username = params.username; ctx._source.usernameAndName = params.usernameAndName;',
				lang: 'painless',
				params: {
					username: user.username,
					usernameAndName: `${ user.username } ${ user.name }`,
				},
			},
		};

		const result = await client.updateByQuery({
			index: 'subscription',
			body: update,
			refresh: true,
		});

		return result;
	}
};

/**
  @param {string} text
  @param {string} roomId
  @param {number} skip
  @param {number} limit
*/
const findUsersInRoom = async(text, roomId, skip = 0, limit = 50) => {
	logger.debug('findUsersInRoom', text, roomId, skip, limit);
	if (!text) {
		logger.warn('find without text');
	}
	if (!roomId) {
		logger.warn('find without roomId');
	}

	if (text && roomId) {
		const find = {
			from: skip,
			size: limit,
			query: {
				bool: {
					must: [
						{ match: { usernameAndName : text } },
						{ match: { roomId } },
					],
				},
			},
		};

		const result = await client.search({
			index: 'subscription',
			body: find,
		});

		if (result.body && result.body.hits && result.body.hits.total && result.body.hits.hits) {
			const { hits, total } = result.body.hits;
			logger.debug('findUsersInRoom', total, hits.length);
			return {
				hits,
				total,
			};
		} else {
			logger.error('result with incorrect body');
		}
	}
};

/**
  @param {[Room]} rooms
*/
const updateRooms = async(rooms) => {
	if (!isUseElastic) { return; }
	if (!Array.isArray(rooms)) {
		logger.error('rooms must be a array!');
		return;
	}
	logger.debug('updateRooms', rooms.length);
	if (rooms.length)	{
		logger.debug('updateRooms', rooms[0]);
	} else {
		return;
	}

	const actions = [];
	for (let i = 0; i < rooms.length; i++) {
		const room = rooms[i];

		const { _id: roomId } = room;

		delete room._id;
		room.fnameAndName = `${ room.fname } ${ room.name }`;

		actions.push({ update : { _index : 'room', _id : roomId } });
		actions.push({ doc: room, doc_as_upsert: true });
	}

	const result = await client.bulk(
		{ refresh: true, body: actions }
	);

	if (result && result.body && result.body.items && Array.isArray(result.body.items)) {
		for (const item of result.body.items) {
			if (!['noop', 'created', 'updated'].includes(item.update.result)) { logger.warn('updateRooms', item); }
		}
	}

	return result;
};


callbacks.add('afterCreateRoom', async(room, { owner, subs }) => {
	logger.debug('afterCreateRoom', owner, room, subs);
	if (subs && subs.length) {
		for (let i = 0; i < subs.length; i++) {
			const { user, subscription } = subs[i];
			let subId;
			if (subscription._id instanceof Promise) {
				subId = await subscription._id;
			} else {
				subId = subscription._id;
			}
			if (!subId) {
				logger.warn('afterCreateRoom without subId');
			}
			if (!user) {
				logger.warn('afterCreateRoom without user');
			}
			if (subId && user) {
				try {
					await addSubscription({ _id: subId, rid: room._id }, user);
				} catch (err) {
					logger.error(err);
				}
			}
		}
	}
	return room;
});

callbacks.add('afterAddedToRoom', async(obj, room) => {
	logger.debug('afterAddedToRoom', obj, room);
	const { subscription, user } = obj;

	let subId;
	if (subscription instanceof Promise) {
		subId = await subscription;
	} else {
		subId = subscription._id;
	}
	if (!subId) {
		logger.warn('afterAddedToRoom without subId');
	}
	if (!user) {
		logger.warn('afterAddedToRoom without user');
	}
	if (subId && user) {
		try {
			await addSubscription({ _id: subId, rid: room._id }, user);
		} catch (err) {
			logger.error(err);
		}
	}
});

callbacks.add('afterLeaveRoom', async(obj) => {
	const { subscription } = obj;
	logger.debug('afterLeaveRoom', subscription);

	if (!subscription) {
		logger.warn('afterLeaveRoom without subscription');
	} else {
		try {
			await delSubscription(subscription);
		} catch (err) {
			logger.error(err);
		}
	}
});

callbacks.add('afterRemoveFromRoom', async(obj) => {
	const { subscription } = obj;
	logger.debug('afterRemoveFromRoom', subscription);

	if (!subscription) {
		logger.warn('afterRemoveFromRoom without subscription');
	} else {
		try {
			await delSubscription(subscription);
		} catch (err) {
			logger.error(err);
		}
	}
});

callbacks.add('afterSaveUser', async(user) => {
	logger.debug('afterSaveUser', user);

	if (!user) {
		logger.warn('afterSaveUser without user');
	} else {
		try {
			await updateUser(user);
		} catch (err) {
			logger.error(err);
		}
	}
});

export const elastic = {
	indeces,
	addSubscription,
	delSubscription,
	updateUser,
	findUsersInRoom,
	updateRooms,
};
