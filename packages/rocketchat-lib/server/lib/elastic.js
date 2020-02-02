import { Client } from '@elastic/elasticsearch';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { settings } from 'meteor/rocketchat:settings';
import { Logger } from 'meteor/rocketchat:logger';
const logger = new Logger('elastic', {});

let isUseElastic = settings.get('Use_elastic');

settings.get('Use_elastic', (key, value) => {
	isUseElastic = value;
});

const client = new Client({ node: 'http://localhost:9200' });

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
};
