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

		if (!rocket_id) {
			return API.v1.failure('The \'rocket_id\' query param is required');
		}

		const user = Users.findOneById(rocket_id);
		if (!user) {
			return API.v1.failure('User not found');
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
		const rooms = Rooms.findByAnonymId(anonym_id, roomsOpts).fetch();
		const subs = Subscriptions.findByUserIdAndRoomIds(user._id, rooms.map((r) => r._id), { fields: { rid: 1, roles: 1, 'u._id': 1 } }).fetch();
		for (let i = 0; i < subs.length; i++) {
			const sub = subs[i];
			const room = rooms.find((r) => r._id === sub.rid);
			room.roles = sub.roles ? sub.roles : [];
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
