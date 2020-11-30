import { Migrations } from 'meteor/rocketchat:migrations';
import { Rooms } from 'meteor/rocketchat:models';

Migrations.add({
	version: 152,
	up() {
		Rooms.model.rawCollection().update({
			t: { $ne: 'd' },
		}, {
			$set: {
				country: 'RU',
			},
		}, {
			multi: true,
		});
	},
});
