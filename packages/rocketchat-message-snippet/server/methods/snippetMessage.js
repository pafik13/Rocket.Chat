import { Meteor } from 'meteor/meteor';
import { Subscriptions, Messages, Users, Rooms } from 'meteor/rocketchat:models';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { isTheLastMessage } from 'meteor/rocketchat:lib';

Meteor.methods({
	snippetMessage(message, filename) {
		if (Meteor.userId() == null) {
			// noinspection JSUnresolvedFunction
			throw new Meteor.Error('error-invalid-user', 'Invalid user',
				{ method: 'snippetMessage' });
		}

		const room = Rooms.findOne({ _id: message.rid });

		if ((typeof room === 'undefined') || (room === null)) {
			return false;
		}

		const subscription = Subscriptions.findOneByRoomIdAndUserId(message.rid, Meteor.userId(), { fields: { _id: 1 } });
		if (!subscription) {
			return false;
		}

		Messages.cloneAndSaveAsHistoryById(message._id);

		const me = Users.findOneById(Meteor.userId());

		message.snippeted = true;
		message.snippetedAt = Date.now;
		message.snippetedBy = {
			_id: Meteor.userId(),
			username: me.username,
		};

		message = callbacks.run('beforeSaveMessage', message);

		// Create the SnippetMessage
		Messages.setSnippetedByIdAndUserId(message, filename, message.snippetedBy,
			message.snippeted, Date.now, filename);
		if (isTheLastMessage(room, message)) {
			Rooms.setLastMessageSnippeted(room._id, message, filename, message.snippetedBy,
				message.snippeted, Date.now, filename);
		}

		Messages.createWithTypeRoomIdMessageAndUser(
			'message_snippeted', message.rid, '', me, {	snippetId: message._id, snippetName: filename });
	},
});
