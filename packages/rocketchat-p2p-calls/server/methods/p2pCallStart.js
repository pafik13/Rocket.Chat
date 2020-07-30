import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { check } from 'meteor/check';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { TAPi18n } from 'meteor/tap:i18n';
import { Notifications } from 'meteor/rocketchat:notifications';
import { Subscriptions, Messages } from 'meteor/rocketchat:models';

Meteor.methods({
	p2pCallStart(roomId) {
		check(roomId, String);

		const caller = Meteor.user();

		if (!caller) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'p2pCallStart',
			});
		}

		const room = Meteor.call('canAccessRoom', roomId, caller._id);
		if (!room) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', {
				method: 'p2pCallStart',
			});
		}

		if (room.t !== 'd') {
			throw new Meteor.Error('error-invalid-room-type', 'Invalid room type', {
				method: 'p2pCallStart',
			});
		}

		const subscription = Subscriptions.findOneByRoomIdAndUserId(roomId, caller._id);
		if (!subscription) {
			Notifications.notifyUser(caller._id, 'message', {
				_id: Random.id(),
				rid: room._id,
				ts: new Date,
				msg: TAPi18n.__('error-logged-user-not-in-room', {
					postProcess: 'sprintf',
					sprintf: [room.name],
				}, caller.language),
			});
			throw new Meteor.Error('You can\'t start call because you are not in room');
		} else if (subscription.blocked || subscription.blocker) {
			Notifications.notifyUser(caller._id, 'message', {
				_id: Random.id(),
				rid: room._id,
				ts: new Date,
				msg: TAPi18n.__('room_is_blocked', {}, caller.language),
			});
			throw new Meteor.Error('You can\'t start call because you are blocked');
		}

		const lastMsg = Messages.getLastStartedP2PCall(room._id);
		if (lastMsg && ['started', 'accepted'].includes(lastMsg.msg)) {
			throw new Meteor.Error('You can\'t start call because last one isn\'t ended');
		}
		const message = Messages.createP2PCallStarted(room, caller);

		return callbacks.run('afterSaveMessage', message, room, caller._id);
	},
});
