import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
// import { Users } from 'meteor/rocketchat:models';
import { addUserToDefaultChannels } from '../functions';

Meteor.methods({
	joinDefaultChannels(silenced) {
		check(silenced, Match.Optional(Boolean));

		const callerId = Meteor.userId();
		if (!callerId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'joinDefaultChannels' });
		}

		this.unblock();
		return addUserToDefaultChannels(Meteor.user(), silenced);
	},
});
