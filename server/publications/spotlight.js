import { Meteor } from 'meteor/meteor';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { Users, Subscriptions, Rooms } from 'meteor/rocketchat:models';
import { settings } from 'meteor/rocketchat:settings';
import { roomTypes } from 'meteor/rocketchat:utils';
import s from 'underscore.string';

function fetchRooms(userId, rooms) {
	if (!settings.get('Store_Last_Message') || hasPermission(userId, 'preview-c-room')) {
		return rooms;
	}

	return rooms.map((room) => {
		delete room.lastMessage;
		return room;
	});
}

Meteor.methods({
	spotlight(text, usernames, type = { users: true, rooms: true }, rid) {
		const result = {
			users: [],
			rooms: [],
		};

		const userOptions = {
			limit: 5,
			fields: {
				username: 1,
				name: 1,
				status: 1,
				customFields: 1,
			},
			sort: {},
		};
		if (settings.get('UI_Use_Real_Name')) {
			userOptions.sort.name = 1;
		} else {
			userOptions.sort.username = 1;
		}

		if (text.toUpperCase().startsWith('ID')) {
			const maybeId = text.substring(2);
			if (maybeId && !isNaN(Number(maybeId))) {
				const user = Users.findOneByAnonymId(maybeId, userOptions);
				if (user) { result.users.push(user); }
				return result;
			}
		}

		const searchForChannels = text[0] === '#';
		const searchForDMs = text[0] === '@';
		if (searchForChannels) {
			type.users = false;
			text = text.slice(1);
		}
		if (searchForDMs) {
			type.rooms = false;
			text = text.slice(1);
		}
		const regex = new RegExp(s.trim(s.escapeRegExp(text)), 'i');
		const roomOptions = {
			limit: 5,
			fields: {
				t: 1,
				name: 1,
				fname: 1,
				joinCodeRequired: 1,
				lastMessage: 1,
				customFields: 1,
				usersCount: 1,
			},
			sort: {
				name: 1,
			},
		};
		const { userId } = this;
		if (userId == null) {
			if (settings.get('Accounts_AllowAnonymousRead') === true) {
				result.rooms = fetchRooms(userId, Rooms.findByNameAndTypeNotDefault(regex, 'c', roomOptions).fetch());
			}
			return result;
		}

		if (hasPermission(userId, 'view-outside-room')) {
			if (type.users === true && hasPermission(userId, 'view-d-room')) {
				result.users = Users.findByActiveUsersExcept(text, usernames, userOptions).fetch();
			}

			if (type.rooms === true && hasPermission(userId, 'view-c-room')) {
				const searchableRoomTypes = Object.entries(roomTypes.roomTypes)
					.filter((roomType) => roomType[1].includeInRoomSearch())
					.map((roomType) => roomType[0]);

				const roomIds = Subscriptions.findByUserIdAndTypes(userId, searchableRoomTypes, { fields: { rid: 1 } }).fetch().map((s) => s.rid);
				result.rooms = fetchRooms(userId, Rooms.findByNameAndTypesNotInIds(regex, searchableRoomTypes, roomIds, roomOptions).fetch());
			}
		} else if (type.users === true && rid) {
			const subscriptions = Subscriptions.find({
				rid, 'u.username': {
					$regex: regex,
					$nin: [...usernames, Meteor.user().username],
				},
			}, { limit: userOptions.limit }).fetch().map(({ u }) => u._id);
			result.users = Users.find({ _id: { $in: subscriptions } }, {
				fields: userOptions.fields,
				sort: userOptions.sort,
			}).fetch();
		}

		return result;
	},
});

DDPRateLimiter.addRule({
	type: 'method',
	name: 'spotlight',
	userId(/* userId*/) {
		return true;
	},
}, 100, 100000);
