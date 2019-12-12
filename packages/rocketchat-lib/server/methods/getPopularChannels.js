import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Rooms } from 'meteor/rocketchat:models';

Meteor.methods({
	getPopularChannels(offset = 0, limit = 20) {
		check(offset, Number);
		check(limit, Number);

		const callerId = Meteor.userId();
		if (!callerId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'getPopularChannels' });
		}

		const query = {
			t: 'c',
		};

		const options = {
			fields: {
				description: 1,
				topic: 1,
				t: 1,
				name: 1,
				fname: 1,
				customFields: 1,
				lastMessage: 1,
				ts: 1,
				archived: 1,
				usersCount: 1,
				msgs: 1,
			},
			sort: {
				usersCount: -1,
				msgs: -1,
			},
			offset,
			limit,
		};

		const rooms = Rooms.find(query, options);
		return {
			total: rooms.count(), // count ignores the `skip` and `limit` options
			records: rooms.fetch(),
		};
	},
});
