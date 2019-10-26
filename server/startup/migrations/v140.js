import { Migrations } from 'meteor/rocketchat:migrations';
import { Rooms } from 'meteor/rocketchat:models';

Migrations.add({
	version: 140,
	up() {
		Rooms.update({
			t: {
				$ne: 'd',
			},
		}, {
			$set: {
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
