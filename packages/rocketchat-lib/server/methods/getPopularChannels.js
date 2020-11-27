import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Rooms } from 'meteor/rocketchat:models';
import { getCountriesWithSameLanguage } from 'meteor/rocketchat:utils';

Meteor.methods({
	getPopularChannels(country, offset = 0, limit = 20) {
		check(country, String);
		check(offset, Number);
		check(limit, Number);

		// 		const callerId = Meteor.userId();
		// 		if (!callerId) {
		// 			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'getPopularChannels' });
		// 		}

		let query = {
			t: 'c',
			country,
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

		let rooms = Rooms.find(query, options);
		let total = rooms.count(); // count ignores the `skip` and `limit` options
		if (!total) {
			const countries = getCountriesWithSameLanguage(country);
			if (countries.length) {
				query = {
					t: 'c',
					country: { $in: countries },
				};
				rooms = Rooms.find(query, options);
				total = rooms.count();
			}
		}
		return {
			total,
			records: rooms.fetch(),
		};
	},
});
