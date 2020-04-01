import { Meteor } from 'meteor/meteor';
import { getRoomByNameOrIdWithOptionToJoin } from 'meteor/rocketchat:lib';
import { Users, Rooms, Subscriptions } from 'meteor/rocketchat:models';
import { hasRole } from 'meteor/rocketchat:authorization';
import { API } from '../api';
import * as heapdump from 'heapdump';
import { existsSync, mkdirSync } from 'fs';
import { elastic } from 'meteor/rocketchat:utils';

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
