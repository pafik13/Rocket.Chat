import { Meteor } from 'meteor/meteor';
import s from 'underscore.string';
import { FileUpload } from 'meteor/rocketchat:file-upload';
import { settings } from 'meteor/rocketchat:settings';
import { Users, Messages, Subscriptions, Rooms } from 'meteor/rocketchat:models';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { RateLimiter } from '../lib';

export const _setUsername = function(userId, u) {
	const username = s.trim(u);
	if (!userId || !username) {
		return false;
	}
	let nameValidation;
	try {
		nameValidation = new RegExp(`^${ settings.get('UTF8_Names_Validation') }$`);
	} catch (error) {
		nameValidation = new RegExp('^[0-9a-zA-Z-_.]+$');
	}
	if (!nameValidation.test(username)) {
		return false;
	}
	const user = Users.findOneById(userId);
	// User already has desired username, return
	if (user.username === username) {
		return user;
	}
	const previousUsername = user.username;
	// Set new username
	Users.setUsername(user._id, username);
	user.username = username;
	// Username is available; if coming from old username, update all references
	if (previousUsername) {
		Messages.updateAllUsernamesByUserId(user._id, username);
		Messages.updateUsernameOfEditByUserId(user._id, username);
		Messages.findByMention(previousUsername).forEach(function(msg) {
			const updatedMsg = msg.msg.replace(new RegExp(`@${ previousUsername }`, 'ig'), `@${ username }`);
			return Messages.updateUsernameAndMessageOfMentionByIdAndOldUsername(msg._id, previousUsername, username, updatedMsg);
		});
		Rooms.replaceUsername(previousUsername, username);
		Rooms.replaceMutedUsername(previousUsername, username);
		Rooms.replaceUsernameOfUserByUserId(user._id, username);
		Subscriptions.setUserUsernameByUserId(user._id, username);
		Subscriptions.setNameForDirectRoomsWithOldName(previousUsername, username);

		const fileStore = FileUpload.getStore('Avatars');
		const file = fileStore.model.findOneByName(previousUsername);
		if (file) {
			fileStore.model.updateFileNameById(file._id, username);
		}
	}
	return user;
};

export const setUsername = RateLimiter.limitFunction(_setUsername, 1, 60000, {
	[0]() {
		return !Meteor.userId() || !hasPermission(Meteor.userId(), 'edit-other-user-info');
	},
});
