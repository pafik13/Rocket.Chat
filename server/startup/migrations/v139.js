import { Migrations } from 'meteor/rocketchat:migrations';
import { Subscriptions } from 'meteor/rocketchat:models';

Migrations.add({
	version: 139,
	up() {
		Subscriptions.model.rawCollection().update({
			t: 'd',
		}, {
			$set: {
				isUploadsAccepted: true,
				isImageFilesAllowed: true,
				isAudioFilesAllowed: true,
				isVideoFilesAllowed: true,
				isOtherFilesAllowed: true,
			},
		}, {
			multi: true,
		});
	},
});
