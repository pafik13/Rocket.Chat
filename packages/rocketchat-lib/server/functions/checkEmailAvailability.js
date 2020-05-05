import { Meteor } from 'meteor/meteor';

export const checkEmailAvailability = function(email) {
	return !Meteor.users.findOne({ 'emails.address': email });
};
