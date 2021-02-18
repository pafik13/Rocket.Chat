import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { roomTypes } from 'meteor/rocketchat:utils';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { FileUpload } from 'meteor/rocketchat:file-upload';
import { Rooms, Messages, Subscriptions } from 'meteor/rocketchat:models';

const maxMessagesRemovedImmediately = 100;

Meteor.methods({
	eraseRoom(rid) {
		check(rid, String);

		if (!Meteor.userId()) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'eraseRoom',
			});
		}

		const room = Rooms.findOneById(rid);

		if (!room) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', {
				method: 'eraseRoom',
			});
		}

		if (!roomTypes.roomTypes[room.t].canBeDeleted(hasPermission, room)) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', {
				method: 'eraseRoom',
			});
		}

		const uploads = FileUpload.getStore('Uploads');
		Messages.findByRoomId(rid, { fields: { 'file._id': 1 }, limit: maxMessagesRemovedImmediately, sort: { ts: -1 } })
			.forEach((message) => {
				if (message.file && message.file._id) {
					uploads.deleteById(message.file._id);
				} else {
					Messages.removeById(message._id);
				}
			});


		Subscriptions.removeByRoomId(rid);
		const result = Rooms.removeById(rid);

		return result;
	},
});
