import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { Users, BannedUsers } from 'meteor/rocketchat:models';

Meteor.methods({
	banUser(data) {
		check(data, Match.ObjectIncluding({
			rid: String,
			username: String,
		}));

		const { rid, username } = data;

		Meteor.call('removeUserFromRoom', { rid, username });

		const userForBan = Users.findOneByUsername(username);

		BannedUsers.createRecord(rid, userForBan._id);

		return true;
	},
});
