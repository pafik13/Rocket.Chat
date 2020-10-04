import { Meteor } from 'meteor/meteor';

Meteor.methods({
	getAvatarSuggestion() {
		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'getAvatarSuggestion',
			});
		}

		this.unblock();

		return [];
	},
});
