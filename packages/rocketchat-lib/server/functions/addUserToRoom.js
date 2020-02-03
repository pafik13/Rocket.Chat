import { Meteor } from 'meteor/meteor';
import { Rooms, Subscriptions, Messages } from 'meteor/rocketchat:models';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { callbacks } from 'meteor/rocketchat:callbacks';

export const addUserToRoom = function(roomOrId, user, inviter, silenced) {
	const now = new Date();
	const room = (typeof roomOrId === 'string') ? Rooms.findOneById(roomOrId) : roomOrId;

	// Check if user is already in room
	let subscription = Subscriptions.findOneByRoomIdAndUserId(room._id, user._id);
	if (subscription) {
		return;
	}

	if (room.t === 'c' || room.t === 'p') {
		// Add a new event, with an optional inviter
		callbacks.run('beforeAddedToRoom', { user, inviter }, room);

		// Keep the current event
		callbacks.run('beforeJoinRoom', user, room);
	}

	const muted = room.ro && !hasPermission(user._id, 'post-readonly');
	if (muted) {
		Rooms.muteUsernameByRoomId(room._id, user.username);
	}

	subscription = Subscriptions.createWithRoomAndUser(room, user, {
		ts: now,
		open: true,
		alert: true,
		unread: 1,
		userMentions: 1,
		groupMentions: 0,
	});

	if (!silenced) {
		if (inviter) {
			Messages.createUserAddedWithRoomIdAndUser(room._id, user, {
				ts: now,
				u: {
					_id: inviter._id,
					username: inviter.username,
				},
			});
		} else {
			Messages.createUserJoinWithRoomIdAndUser(room._id, user, { ts: now });
		}
	}

	if (room.t === 'c' || room.t === 'p') {
		Meteor.defer(function() {
			// Add a new event, with an optional inviter
			callbacks.run('afterAddedToRoom', { user, inviter, subscription }, room);

			// Keep the current event
			callbacks.run('afterJoinRoom', user, room);
		});
	}

	return true;
};
