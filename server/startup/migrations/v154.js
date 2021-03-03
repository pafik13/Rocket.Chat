import { Meteor } from 'meteor/meteor';
import { Migrations } from 'meteor/rocketchat:migrations';
import { getUsersInRole } from 'meteor/rocketchat:authorization';
import { Permissions } from 'meteor/rocketchat:models';

Migrations.add({
	version: 154,
	up() {
		if (Permissions) {

			const admin = getUsersInRole('admin').fetch();

			const permsForDelete = [
				'add-oauth-service',
				'manage-oauth-apps',
				'manage-integrations',
				'manage-own-integrations',
			];

			for (const permId of permsForDelete) {
				const perm = Permissions.findOne(permId);


				if (perm) {
					Meteor.runAsUser(admin._id, () => Permissions.remove({ _id: permId }));
				}
			}

		}
	},
});
