import { Migrations } from 'meteor/rocketchat:migrations';
import { Permissions } from 'meteor/rocketchat:models';

Migrations.add({
	version: 146,
	up() {
		if (Permissions) {

			const permId = 'view-p-file-list';
			const viewPFileList = Permissions.findOne(permId);

			if (viewPFileList) {
				Permissions.remove({ _id: permId });
			}
		}
	},
});
