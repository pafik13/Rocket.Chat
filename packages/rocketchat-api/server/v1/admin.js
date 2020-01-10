import { Meteor } from 'meteor/meteor';
import { getRoomByNameOrIdWithOptionToJoin } from 'meteor/rocketchat:lib';
import { Users } from 'meteor/rocketchat:models';
import { hasRole } from 'meteor/rocketchat:authorization';
import { API } from '../api';
import * as heapdump from 'heapdump';
import { existsSync, mkdirSync } from 'fs';

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
