import { Meteor } from 'meteor/meteor';
import { Messages, Uploads, Rooms } from 'meteor/rocketchat:models';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { isTheLastMessage } from 'meteor/rocketchat:lib';

export const deleteMessage = function(message, user) {
	const deletedMsg = Messages.findOneById(message._id);
	Messages.cloneAndSaveAsHistoryById(message._id);
	if (message.file && message.file._id) {
		Uploads.update(message.file._id, { $set: { _hidden: true } });
	}

	Meteor.defer(function() {
		callbacks.run('afterDeleteMessage', deletedMsg);
	});

	// update last message
	const room = Rooms.findOneById(message.rid, { fields: { lastMessage: 1 } });
	if (isTheLastMessage(room, message)) {
		Rooms.resetLastMessageById(message.rid, message._id);
	}

	Messages.setAsDeletedByIdAndUser(message._id, user);
	Rooms.incMessageEventsCountById(message.rid);
};

