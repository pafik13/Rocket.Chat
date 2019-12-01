import { Meteor } from 'meteor/meteor';
import { Users } from 'meteor/rocketchat:models';

Meteor.methods({
	cleanupDeactivations() {
		Users.removeDeactivations();
		return true;
	},
});
