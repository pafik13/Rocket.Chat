import { Migrations } from 'meteor/rocketchat:migrations';
import { Rooms } from 'meteor/rocketchat:models';

Migrations.add({
	version: 143,
	up() {
		Rooms.model.rawCollection().update({
			t: 'p',
		}, {
			$set: {
				membersHidden: false,
			},
		}, {
			multi: true,
		});
	},
});
