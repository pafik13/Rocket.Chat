import { Meteor } from 'meteor/meteor';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { Rooms } from 'meteor/rocketchat:models';

Meteor.publish('adminBlacklistedRooms', function(types, limit) {
	if (!this.userId) {
		return this.ready();
	}
	if (hasPermission(this.userId, 'view-room-administration') !== true) {
		return this.ready();
	}
	if (!Array.isArray(types)) {
		types = [];
	}

	const options = {
		fields: {
			name: 1,
			fname:1,
			t: 1,
			cl: 1,
			u: 1,
			usernames: 1,
			usersCount: 1,
			muted: 1,
			ro: 1,
			default: 1,
			topic: 1,
			msgs: 1,
			archived: 1,
			tokenpass: 1,
			blacklisted: 1,
		},
		limit,
		sort: {
			default: -1,
			name: 1,
		},
	};

	const query = {
		t: {
			$in: types,
		},
		blacklisted: true,
	};

	return Rooms.find(query, options);
});
