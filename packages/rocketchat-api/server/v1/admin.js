import { Meteor } from 'meteor/meteor';
import { getRoomByNameOrIdWithOptionToJoin } from 'meteor/rocketchat:lib';
import { Users } from 'meteor/rocketchat:models';
import { hasRole } from 'meteor/rocketchat:authorization';
import { API } from '../api';

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
			console.log('admin.createDirectMessage', usernames);
			const userId_1 = Users.findOneByUsername(usernames[0])._id;
			const userId_2 = Users.findOneByUsername(usernames[1])._id;
			console.log('admin.createDirectMessage', userId_1, userId_2);
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
