import { Migrations } from 'meteor/rocketchat:migrations';
import { Rooms, Permissions } from 'meteor/rocketchat:models';

Migrations.add({
	version: 153,
	async up() {
		await Rooms.model.rawCollection().update({
			t: 'c',
		}, {
			$set: {
				canMembersAddUser: true,
				linkVisible: true,
			},
		}, {
			multi: true,
		});
		await Rooms.model.rawCollection().update({
			t: 'p',
		}, {
			$set: {
				canMembersAddUser: false,
			},
		}, {
			multi: true,
		});

		if (Permissions) {

			const permsForDelete = [
				'add-user-to-any-c-room',
				'add-user-to-any-p-room',
			];

			for (const permId of permsForDelete) {
				const perm = Permissions.findOne(permId);

				if (perm) {
					Permissions.remove({ _id: permId });
				}
			}

		}
	},
});
