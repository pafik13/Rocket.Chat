import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { Users, BannedUsers } from 'meteor/rocketchat:models';

Meteor.methods({
	isUserBanned(data) {
		check(data, Match.ObjectIncluding({
			rid: String,
			username: String,
		}));

		const { rid, username } = data;

		const bannedUser = Users.findOneByUsername(username);

		return BannedUsers.isUserIsBanned(rid, bannedUser._id);
	},
});
