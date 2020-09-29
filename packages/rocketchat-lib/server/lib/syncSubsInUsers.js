import { callbacks } from 'meteor/rocketchat:callbacks';
import { Subscriptions, Users } from 'meteor/rocketchat:models';
import { Logger } from 'meteor/rocketchat:logger';
const logger = new Logger('syncSubsInUsers', {});

/**
  @param {string} subId
  @param {string} userId
*/
const addSubscription = async(subId, userId) => {
	logger.debug('addSubscription', subId, userId);
	const subscription = await Subscriptions.model.rawCollection().findOne({ _id: subId }, {
		projection: {
			audioNotifications: 1,
			audioNotificationValue: 1,
			audioPrefOrigion: 1,
			desktopNotifications: 1,
			desktopNotificationDuration: 1,
			desktopPrefOrigin: 1,
			mobilePushNotifications: 1,
			mobilePrefOrigin: 1,
			emailNotifications: 1,
			emailPrefOrigin: 1,
			disableNotifications: 1,
		},
	});
	logger.debug('addSubscription', subscription);
	const result = await Users.model.rawCollection().update({ _id: userId }, {
		$push: {
			subscriptions: subscription,
		},
	});
	logger.debug('addSubscription', result);
	return result;
};

/**
  @param {string} subId
  @param {string} userId
*/
const delSubscription = async(subId, userId) => {
	logger.debug('delSubscription', subId, userId);
	const result = await Users.model.rawCollection().update({ _id: userId }, {
		$pull: {
			subscriptions: { _id: subId },
		},
	});
	logger.debug('delSubscription', result);
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
					await addSubscription(subId, user._id);
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
			await addSubscription(subId, user._id);
		} catch (err) {
			logger.error(err);
		}
	}
	return obj;
});

callbacks.add('afterLeaveRoom', async(obj) => {
	const { user, subscription } = obj;
	logger.debug('afterLeaveRoom', subscription, user);

	if (!subscription) {
		logger.warn('afterLeaveRoom without subscription');
	}

	if (!user) {
		logger.warn('afterLeaveRoom without user');
	}

	if (subscription && user) {
		try {
			await delSubscription(subscription._id, user._id);
		} catch (err) {
			logger.error(err);
		}
	}
	return obj;
});

callbacks.add('afterRemoveFromRoom', async(obj) => {
	const { removedUser: user, subscription } = obj;
	logger.debug('afterRemoveFromRoom', subscription, user);

	if (!subscription) {
		logger.warn('afterRemoveFromRoom without subscription');
	}

	if (!user) {
		logger.warn('afterRemoveFromRoom without user');
	}

	if (subscription && user) {
		try {
			await delSubscription(subscription._id, user._id);
		} catch (err) {
			logger.error(err);
		}
	}
	return obj;
});


