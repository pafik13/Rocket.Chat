import { Meteor } from 'meteor/meteor';
import { Messages, Rooms } from 'meteor/rocketchat:models';
import { settings } from 'meteor/rocketchat:settings';
import { callbacks } from 'meteor/rocketchat:callbacks';

export const updateMessage = function(message, user, originalMessage) {
	if (!originalMessage) {
		originalMessage = Messages.findOneById(message._id);
	}

	// If we keep history of edits, insert a new message to store history information
	if (settings.get('Message_KeepHistory')) {
		Messages.cloneAndSaveAsHistoryById(message._id);
	}

	message.editedAt = new Date();
	message.editedBy = {
		_id: user._id,
		username: user.username,
	};

	const urls = message.msg.match(/([A-Za-z]{3,9}):\/\/([-;:&=\+\$,\w]+@{1})?([-A-Za-z0-9\.]+)+:?(\d+)?((\/[-\+=!:~%\/\.@\,\w]*)?\??([-\+=&!:;%@\/\.\,\w]+)?(?:#([^\s\)]+))?)?/g) || [];
	message.urls = urls.map((url) => ({ url }));

	message = callbacks.run('beforeSaveMessage', message);

	const tempid = message._id;
	delete message._id;

	Messages.update({ _id: tempid }, { $set: message });

	const room = Rooms.findOneById(message.rid);

	Meteor.defer(function() {
		callbacks.run('afterSaveMessage', Messages.findOneById(tempid), room, user._id);
	});
};
