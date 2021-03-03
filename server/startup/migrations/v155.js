import { Meteor } from 'meteor/meteor';
import { Migrations } from 'meteor/rocketchat:migrations';
import { getUsersInRole } from 'meteor/rocketchat:authorization';
import { Settings } from 'meteor/rocketchat:models';

Migrations.add({
	version: 155,
	up() {
		if (Settings) {

			const admin = getUsersInRole('admin').fetch();

			const settingsForDelete = [
				'RetentionPolicy',
				'CAS',
				'OAuth',
				'WebRTC',
				'Email',
				'Video Conference',
				'E2E Encryption',
				'Federation',
			];

			for (const group of settingsForDelete) {
				Meteor.runAsUser(admin._id, () => Settings.remove({ _id: group }));
				Meteor.runAsUser(admin._id, () => Settings.remove({ group }));
			}

		}
	},
});
