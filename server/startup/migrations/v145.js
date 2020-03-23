import { Migrations } from 'meteor/rocketchat:migrations';
import { Rooms } from 'meteor/rocketchat:models';

Migrations.add({
	version: 145,
	up() {
		Rooms.update({
			t: { $ne: 'd' },
			filesHidden: { $exists: false },
		}, {
			$set: {
				filesHidden: false,
			},
		}, {
			multi: true,
		});
	},
});
