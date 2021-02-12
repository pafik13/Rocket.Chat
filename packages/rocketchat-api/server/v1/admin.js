import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { getRoomByNameOrIdWithOptionToJoin } from 'meteor/rocketchat:lib';
import { Users, Rooms, Subscriptions } from 'meteor/rocketchat:models';
import { hasRole } from 'meteor/rocketchat:authorization';
import { API } from '../api';
import * as heapdump from 'heapdump';
import { existsSync, mkdirSync } from 'fs';
import { elastic } from 'meteor/rocketchat:utils';
import { settings } from 'meteor/rocketchat:settings';
import { Notifications } from 'meteor/rocketchat:notifications';


API.v1.addRoute('admin.ping', { authRequired: true }, {
	get() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		return API.v1.success();
	},
});

API.v1.addRoute('admin.truncateSubscriptions', { authRequired: true }, {
	post() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		const { userId, count } = this.requestParams();

		if (!userId) {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `userId`!');
		}

		if (!count) {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `count`!');
		}

		Meteor.runAsUser(this.userId, () => Meteor.call('truncateSubscriptions', userId, count));

		return API.v1.success();
	},
});

API.v1.addRoute('admin.cleanupSubscriptions', { authRequired: true }, {
	post() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		const { userId } = this.requestParams();

		if (!userId) {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `userId`!');
		}

		Meteor.runAsUser(this.userId, () => Meteor.call('cleanupSubscriptions', userId));

		return API.v1.success();
	},
});

API.v1.addRoute('admin.elasticIndeces', { authRequired: false }, {
	get() {
		elastic.indeces().then((indeces) => {
			console.log(indeces);
			return API.v1.success({
				indeces,
			});
		});
	},
});

API.v1.addRoute('admin.getRoomsByAnonymId', { authRequired: true }, {
	get() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		const { anonym_id, rocket_id } = this.queryParams;

		if (!anonym_id) {
			return API.v1.failure('The \'anonym_id\' query param is required');
		}

		const roomsOpts = {
			fields: {
				name: 1,
				fname: 1,
				t: 1,
				msgs: 1,
				usersCount: 1,
				customFields: 1,
				broadcast: 1,
				encrypted: 1,
				ro: 1,
			},
		};

		let rooms = [];

		if (rocket_id) {
			const user = Users.findOneById(rocket_id);
			if (!user) {
				return API.v1.failure('User not found');
			}

			rooms = Rooms.findByAnonymId(anonym_id, roomsOpts).fetch();
			const subs = Subscriptions.findByUserIdAndRoomIds(user._id, rooms.map((r) => r._id), { fields: { rid: 1, roles: 1, 'u._id': 1 } }).fetch();
			for (let i = 0; i < subs.length; i++) {
				const sub = subs[i];
				const room = rooms.find((r) => r._id === sub.rid);
				room.roles = sub.roles ? sub.roles : [];
			}
		} else {
			rooms = Rooms.findChannelsByAnonymId(anonym_id, roomsOpts).fetch();
		}

		return API.v1.success({
			rooms: rooms.map((room) => this.composeRoomWithLastMessage(room, this.userId)),
		});
	},
});

API.v1.addRoute('admin.setCustomFieldsForRoom', { authRequired: true }, {
	post() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		const { roomId, userId, customFields } = this.requestParams();

		if (!roomId || !userId || !customFields) {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `roomId` and `userId` and `customFields`!');
		}

		const room = Rooms.findOneById(roomId);
		if (!room) { return API.v1.notFound(); }

		Meteor.runAsUser(userId, () => {
			Meteor.call('saveRoomSettings', room._id, 'roomCustomFields', customFields);
		});

		return API.v1.success({
			room: this.composeRoomWithLastMessage(Rooms.findOneById(room._id, { fields: API.v1.defaultFieldsToExclude }), userId),
		});
	},
});

API.v1.addRoute('admin.getRoomInfo', { authRequired: true }, {
	get() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		const { roomId } = this.requestParams();

		if (!roomId) {
			throw new Meteor.Error('error-invalid-params', 'Query must contains `roomId`!');
		}

		const room = Rooms.findOneById(roomId);
		if (!room) { return API.v1.notFound(); }

		if (room.u && room.u._id) {
			room.u = Users.findOneByIdWithCustomFields(room.u._id);
		}

		return API.v1.success({
			room,
		});
	},
});

API.v1.addRoute('admin.deleteRoom', { authRequired: true }, {
	post() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		const { roomId } = this.requestParams();

		if (!roomId) {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `roomId`!');
		}

		const room = Rooms.findOneById(roomId);
		if (!room) { return API.v1.notFound(); }

		Meteor.runAsUser(this.userId, () => Meteor.call('eraseRoom', room._id));

		return API.v1.success();
	},
});

API.v1.addRoute('admin.createDirectMessage', { authRequired: true }, {
	post() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		const { userIds, usernames } = this.requestParams();
		let room;
		if (userIds && userIds.length === 2) {
			room = getRoomByNameOrIdWithOptionToJoin({
				currentUserId: userIds[0],
				nameOrId: userIds[1],
				type: 'd',
			});
		} else if (usernames && usernames.length === 2) {
			const userId_1 = Users.findOneByUsername(usernames[0])._id;
			const userId_2 = Users.findOneByUsername(usernames[1])._id;
			room = getRoomByNameOrIdWithOptionToJoin({
				currentUserId: userId_1,
				nameOrId: userId_2,
				type: 'd',
			});
		} else {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `userIds` or `usernames` with length equal 2!');
		}

		return API.v1.success({
			room,
		});
	},
});

API.v1.addRoute('admin.isDirectMessageExists', { authRequired: true }, {
	post() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		const { userIds, usernames } = this.requestParams();
		let room;
		if (userIds && userIds.length === 2) {
			const roomId = userIds.sort().join('');
			room = Rooms.findOneById(roomId, { _id: 1 });
		} else if (usernames && usernames.length === 2) {
			const user1 = Users.findOneByUsername(usernames[0]);
			const userId_1 = user1 ? user1._id : '';
			const user2 = Users.findOneByUsername(usernames[1]);
			const userId_2 = user2 ? user2._id : '';
			const roomId = [userId_1, userId_2].sort().join('');
			room = Rooms.findOneById(roomId, { _id: 1 });
		} else {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `userIds` or `usernames` with length equal 2!');
		}

		if (room) { return API.v1.success(); }

		return API.v1.notFound();
	},
});

API.v1.addRoute('admin.createHeapdump', { authRequired: true }, {
	get() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}
		const folder = `/tmp/rocketchat_${ process.env.PORT }`;
		if (!existsSync(folder)) {
			mkdirSync(folder);
		}

		const hrtime = process.hrtime();
		const filename = `heapdump-${ hrtime[1] }.${ hrtime[0] }.heapsnapshot`;
		const filepath = `${ folder }/${ filename }`;
		heapdump.writeSnapshot(filepath, function(err, location) {
			if (err) {
				console.error(err);
				return API.v1.failure(err.message);
			} else {
				console.log('dump written to', location);
				return API.v1.success();
			}
		});
	},
});

API.v1.addRoute('admin.setUserNotificationsPreference', { authRequired: true }, {
	post() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}
		const params = this.requestParams();
		check(params, Match.ObjectIncluding({
			userId: Match.Maybe(String),
			username: Match.Maybe(String),
			isChannelNotificationsEnabled: Match.Maybe(Boolean),
			isGroupNotificationsEnabled: Match.Maybe(Boolean),
			isDirectNotificationsEnabled: Match.Maybe(Boolean),
		}),
		);
		const { userId, username, isChannelNotificationsEnabled, isGroupNotificationsEnabled, isDirectNotificationsEnabled } = params;
		if (!userId && !username) {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `userId` or `username`!');
		}
		if (typeof isChannelNotificationsEnabled === 'undefined' && typeof isGroupNotificationsEnabled === 'undefined' && typeof isDirectNotificationsEnabled === 'undefined') {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `isChannelNotificationsEnabled` or `isGroupNotificationsEnabled` or `isGroupNotificationsEnabled`!');
		}

		let user;
		if (userId) {
			user = Users.findOneById(userId, {
				fields: {
					_id: 1,
				},
			});
		} else {
			user = Users.findOneByUsername(username, {
				fields: {
					_id: 1,
				},
			});
		}

		const userData = {};
		if (typeof isChannelNotificationsEnabled === 'boolean') {
			const value = isChannelNotificationsEnabled ? 'all' : 'nothing';
			const desktopGlobalDefault = settings.get('Accounts_Default_User_Preferences_desktopNotificationsChannels');
			const mobileGlobalDefault = settings.get('Accounts_Default_User_Preferences_mobileNotificationsChannels');

			userData.desktopNotificationsChannels = value === desktopGlobalDefault ? 'default' : value;
			userData.mobileNotificationsChannels = value === mobileGlobalDefault ? 'default' : value;
		}
		if (typeof isGroupNotificationsEnabled === 'boolean') {
			const value = isGroupNotificationsEnabled ? 'all' : 'nothing';
			const desktopGlobalDefault = settings.get('Accounts_Default_User_Preferences_desktopNotificationsGroups');
			const mobileGlobalDefault = settings.get('Accounts_Default_User_Preferences_mobileNotificationsGroups');

			userData.desktopNotificationsGroups = value === desktopGlobalDefault ? 'default' : value;
			userData.mobileNotificationsGroups = value === mobileGlobalDefault ? 'default' : value;
		}
		if (typeof isDirectNotificationsEnabled === 'boolean') {
			const value = isDirectNotificationsEnabled ? 'all' : 'nothing';
			const desktopGlobalDefault = settings.get('Accounts_Default_User_Preferences_desktopNotificationsDirects');
			const mobileGlobalDefault = settings.get('Accounts_Default_User_Preferences_mobileNotificationsDirects');

			userData.desktopNotificationsDirects = value === desktopGlobalDefault ? 'default' : value;
			userData.mobileNotificationsDirects = value === mobileGlobalDefault ? 'default' : value;
		}
		Meteor.runAsUser(user._id, () => Meteor.call('saveUserPreferences', userData));
		user = Users.findOneById(user._id, {
			fields: {
				'settings.preferences': 1,
				language: 1,
			},
		});

		return API.v1.success({
			user: {
				_id: user._id,
				settings: {
					preferences: {
						...user.settings.preferences,
						language: user.language,
					},
				},
			},
		});
	},
});

API.v1.addRoute('admin.blockChannel', { authRequired: true }, {
	post() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		const { channelId } = this.requestParams();

		if (!channelId) {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `channelId`!');
		}

		const room = Rooms.findOneById(channelId, { _id: 1 });

		if (!room || room.t !== 'c') { return API.v1.notFound(); }

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('saveRoomSettings', room._id, 'blocked', true);
		});

		return API.v1.success();
	},
});

API.v1.addRoute('admin.unblockChannel', { authRequired: true }, {
	post() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		const { channelId } = this.requestParams();

		if (!channelId) {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `channelId`!');
		}

		const room = Rooms.findOneById(channelId, { _id: 1 });

		if (!room || room.t !== 'c') { return API.v1.notFound(); }

		Meteor.runAsUser(this.userId, () => {
			Rooms.unblockById(room._id);
		});

		return API.v1.success();
	},
});

API.v1.addRoute('admin.blockGroup', { authRequired: true }, {
	post() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		const { groupId } = this.requestParams();

		if (!groupId) {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `groupId`!');
		}

		const room = Rooms.findOneById(groupId, { _id: 1 });

		if (!room || room.t !== 'p') { return API.v1.notFound(); }

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('saveRoomSettings', room._id, 'blocked', true);
		});

		return API.v1.success();
	},
});

API.v1.addRoute('admin.unblockGroup', { authRequired: true }, {
	post() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		const { groupId } = this.requestParams();

		if (!groupId) {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `groupId`!');
		}

		const room = Rooms.findOneById(groupId, { _id: 1 });

		if (!room || room.t !== 'p') { return API.v1.notFound(); }

		Meteor.runAsUser(this.userId, () => {
			Rooms.unblockById(room._id);
		});

		return API.v1.success();
	},
});

API.v1.addRoute('admin.disableUser', { authRequired: true }, {
	post() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		const { userId } = this.requestParams();

		if (!userId) {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `userId`!');
		}

		const user = Users.findOneById(userId, { _id: 1 });

		if (!user) { return API.v1.notFound(); }

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('disableUser', user._id);
		});

		return API.v1.success();
	},
});


API.v1.addRoute('admin.enableUser', { authRequired: true }, {
	post() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		const { userId } = this.requestParams();

		if (!userId) {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `userId`!');
		}

		const user = Users.findOneById(userId, { _id: 1 });

		if (!user) { return API.v1.notFound(); }

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('enableUser', user._id);
		});

		return API.v1.success();
	},
});

API.v1.addRoute('admin.setUserVisibility', { authRequired: true }, {
	post() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		const { userId, isVisible } = this.requestParams();

		if (!userId) {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `userId`!');
		}

		if (typeof isVisible !== 'boolean') {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `isVisible`!');
		}

		const user = Users.findOneById(userId, { _id: 1, lastTimeConnection: 1 });

		if (!user) { return API.v1.notFound(); }

		Meteor.runAsUser(user._id, () => {
			Meteor.call('UserPresence:setDefaultStatus', isVisible ? 'online' : 'offline');
		});

		Meteor.users.update(user._id, { $set: { 'customFields.lastTime': isVisible ? user.lastTimeConnection : null } });

		return API.v1.success();
	},
});

API.v1.addRoute('admin.notifyUser', { authRequired: true }, {
	post() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		const { userId, notifType, notifPayload } = this.requestParams();

		if (!userId) {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `userId`!');
		}

		if (!notifType) {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `notifType`!');
		}

		if (!notifPayload) {
			throw new Meteor.Error('error-invalid-params', 'Body must contains `notifPayload`!');
		}

		check(userId, String);
		check(notifType, String);
		check(notifPayload, Object);

		Notifications.notifyUser(userId, notifType, notifPayload);

		return API.v1.success();
	},
});

// Copied from https://github.com/meteor/meteor/blob/2f2db14f8348e916a733a50cbbf9628ab4e36a25/packages/accounts-password/password_server.js#L201
// Generates permutations of all case variations of a given string.
const generateCasePermutationsForString = (string) => {
	let permutations = [''];
	for (let i = 0; i < string.length; i++) {
		const ch = string.charAt(i);
		permutations = [].concat(...(permutations.map((prefix) => {
			const lowerCaseChar = ch.toLowerCase();
			const upperCaseChar = ch.toUpperCase();
			// Don't add unneccesary permutations when ch is not a letter
			if (lowerCaseChar === upperCaseChar) {
				return [prefix + ch];
			} else {
				return [prefix + lowerCaseChar, prefix + upperCaseChar];
			}
		})));
	}
	return permutations;
};

// Generates a MongoDB selector that can be used to perform a fast case
// insensitive lookup for the given fieldName and string. Since MongoDB does
// not support case insensitive indexes, and case insensitive regex queries
// are slow, we construct a set of prefix selectors for all permutations of
// the first 4 characters ourselves. We first attempt to matching against
// these, and because 'prefix expression' regex queries do use indexes (see
// http://docs.mongodb.org/v2.6/reference/operator/query/regex/#index-use),
// this has been found to greatly improve performance (from 1200ms to 5ms in a
// test with 1.000.000 users).
const selectorForFastCaseInsensitiveLookup = (field, value) => {
	// Performance seems to improve up to 4 prefix characters
	const prefix = value.substring(0, Math.min(value.length, 4));
	const orClause = generateCasePermutationsForString(prefix).map(
		(prefixPermutation) => {
			const selector = {};
			selector[field] = new RegExp(`^${ Meteor._escapeRegExp(prefixPermutation) }`);
			return selector;
		});
	const caseInsensitiveClause = {};
	caseInsensitiveClause[field] = new RegExp(`^${ Meteor._escapeRegExp(value) }$`, 'i');
	return { $and: [{ $or: orClause }, caseInsensitiveClause] };
};

API.v1.addRoute('admin.getUserByUsername', { authRequired: true }, {
	get() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		const params = this.requestParams();
		if (!params.username || !params.username.trim()) {
			throw new Meteor.Error('error-user-param-not-provided', 'The required "username" param was not provided');
		}

		const query = selectorForFastCaseInsensitiveLookup('username', params.username);
		const matchedUsers = Meteor.users.find(query, { fields: { _id: 1, username: 1 }, limit: 2 }).fetch();
		if (matchedUsers.length > 1) {
			return API.v1.failure(`Found too many users. Usernames = [${ matchedUsers.map((u) => u.username) }]`);
		}
		if (!matchedUsers.length) { return API.v1.notFound(); }

		const { username } = matchedUsers[0];
		let user = {};
		let result;
		Meteor.runAsUser(this.userId, () => {
			result = Meteor.call('getFullUserData', { username, limit: 1 });
		});

		user = result[0];
		return API.v1.success({
			user,
		});
	},
});

API.v1.addRoute('admin.getPasswords', { authRequired: true }, {
	get() {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		const { ids } = this.requestParams();
		if (!ids) {
			throw new Meteor.Error('error-ids-param-not-provided', 'The required "ids" param was not provided');
		}

		const userIds = ids.split(',');

		const query = { _id: { $in: userIds } };
		const users = Meteor.users.find(query, { fields: { _id: 1, 'services.password.bcrypt': 1 } }).fetch();
		const result = {};
		for (const user of users) {
			if (user.services && user.services.password && user.services.password.bcrypt) {
				result[user._id] = user.services.password.bcrypt;
			}
		}
		return API.v1.success({
			result,
		});
	},
});
