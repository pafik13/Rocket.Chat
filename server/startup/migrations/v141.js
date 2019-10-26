import { Migrations } from 'meteor/rocketchat:migrations';
import { Subscriptions } from 'meteor/rocketchat:models';

Migrations.add({
	version: 141,
	up() {
		Subscriptions.update({
			t: {
				$ne: 'd',
			},
		}, {
			$unset: {
				isUploadsAccepted: '',
				isImageFilesAllowed: '',
				isAudioFilesAllowed: '',
				isVideoFilesAllowed: '',
				isOtherFilesAllowed: '',
			},
		}, {
			multi: true,
		});
	},
});
