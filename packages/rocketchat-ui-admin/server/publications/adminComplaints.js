import { Meteor } from 'meteor/meteor';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { Complaints, Rooms, Users } from 'meteor/rocketchat:models';
import _ from 'underscore';

Meteor.publish('adminComplaints', function(types, fromDate, limit) {
	if (!this.userId) {
		return this.ready();
	}
	if (hasPermission(this.userId, 'view-room-administration') !== true) {
		return this.ready();
	}
	if (!_.isArray(types)) {
		types = [];
	}

	const options = {
		fields: {
			t: 1,
			ts: 1,
			roomId: 1,
			userId: 1,
			reason: 1,
			creatorId: 1,
		},
		limit,
		sort: {
			ts: -1,
			reason: 1,
		},
	};

	const cursor = Complaints.findByTypesAndFromDate(types, fromDate, options);

	//   return cursor;
	const complaints = cursor.fetch();
	const userIds = new Set();
	const roomIds = new Set();
	complaints.forEach((c) => {
		userIds.add(c.userId);
		userIds.add(c.creatorId);
		roomIds.add(c.roomId);
	});
	const self = this;

	const handle = cursor.observeChanges({
		added: (id, fields) => {
			if (fields.creatorId && !userIds.has(fields.creatorId)) {
				userIds.add(fields.creatorId);
				this.added('users', fields.creatorId, Users.findOneByIdWithCustomFields(fields.creatorId));
			}

			if (fields.userId || fields.roomId) {
				if (fields.userId && !userIds.has(fields.userId)) {
					userIds.add(fields.userId);
					this.added('users', fields.userId, Users.findOneByIdWithCustomFields(fields.userId));
				}

				if (fields.roomId && !roomIds.has(fields.roomId)) {
					roomIds.add(fields.roomId);
					this.added('rocketchat_room', fields.roomId, Rooms.findOneByIdOrName(fields.roomId));
				}
			}
		},

		removed: (id, fields) => {
			console.log('adminComplaints:cursor.observeChanges.removed', id, fields);
		},

		// We don't care about `changed` events.
	});

	// Stop observing the cursor when the client unsubscribes. Stopping a
	// subscription automatically takes care of sending the client any `removed`
	// messages.
	self.onStop(() => handle.stop());

	self.ready();

	return [
		cursor,
		Users.findByIds(Array.from(userIds)),
		Rooms.findByIds(Array.from(roomIds)),
	];
});
