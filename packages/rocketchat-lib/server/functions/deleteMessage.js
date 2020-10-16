import { Meteor } from 'meteor/meteor';
import { FileUpload } from 'meteor/rocketchat:file-upload';
import { settings } from 'meteor/rocketchat:settings';
import { Messages, Uploads, Rooms } from 'meteor/rocketchat:models';
import { Notifications } from 'meteor/rocketchat:notifications';
import { callbacks } from 'meteor/rocketchat:callbacks';

export const deleteMessage = function(message, user) {
	const keepHistory = settings.get('Message_KeepHistory');
	const showDeletedStatus = settings.get('Message_ShowDeletedStatus');
	const deletedMsg = Messages.findOneById(message._id);

	if (keepHistory) {
		if (showDeletedStatus) {
			Messages.cloneAndSaveAsHistoryById(message._id);
		} else {
			Messages.setHiddenById(message._id, true);
		}

		if (message.file && message.file._id) {
			Uploads.update(message.file._id, { $set: { _hidden: true } });
		}
	} else {
		if (!showDeletedStatus) {
			Messages.removeById(message._id);
		}

		if (message.file && message.file._id) {
			FileUpload.getStore('Uploads').deleteById(message.file._id);
		}
	}

	Meteor.defer(function() {
		callbacks.run('afterDeleteMessage', deletedMsg);
	});

	// update last message
	if (settings.get('Store_Last_Message')) {
		const room = Rooms.findOneById(message.rid, { fields: { lastMessage: 1 } });
		if (!room.lastMessage || room.lastMessage._id === message._id) {
			Rooms.resetLastMessageById(message.rid, message._id);
		} else {
			Rooms.incMessageEventsCountById(message.rid);
		}
	}

	if (showDeletedStatus) {
		Messages.setAsDeletedByIdAndUser(message._id, user);
	} else {
		Notifications.notifyRoom(message.rid, 'deleteMessage', { _id: message._id });
	}
};

