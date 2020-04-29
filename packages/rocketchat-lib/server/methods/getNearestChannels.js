import { Meteor } from 'meteor/meteor';
import { Rooms } from 'meteor/rocketchat:models';
import { check } from 'meteor/check';
import { validateGeoJSON } from 'meteor/rocketchat:utils';

Meteor.methods({
	getNearestChannels(point, maxDistInMeters, minDistInMeters = 0, offset = 0, limit = 20) {
		check(point, Object);
		check(maxDistInMeters, Number);
		check(minDistInMeters, Number);
		check(offset, Number);
		check(limit, Number);

		const callerId = Meteor.userId();
		if (!callerId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', { method: 'getNearestChannels' });
		}
		const pointErrors = validateGeoJSON(point);
		if (pointErrors) {
			throw new Meteor.Error('error-invalid-point', pointErrors, { function: 'getNearestChannels' });
		}

		const query = {
			t: 'c',
			location: {
				$near: {
					$geometry: point,
					$maxDistance: maxDistInMeters,
					$minDistance: minDistInMeters,
				},
			},
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
				distance: 1,
			},
			offset,
			limit,
		};

		const total = Rooms.find(query).count();
		const records = Promise.await(Rooms.model.rawCollection().aggregate([{
			$geoNear: {
				near: point,
				distanceField: 'distance',
				maxDistance: maxDistInMeters,
				minDistance: minDistInMeters,
				query: { t: 'c' },
				spherical: true,
			},
		},
		{ $skip: options.offset },
		{ $limit: options.limit },
		{ $project: options.fields },
		]).toArray());

		return {
			total, // count ignores the `skip` and `limit` options
			records,
		};
	},
});
