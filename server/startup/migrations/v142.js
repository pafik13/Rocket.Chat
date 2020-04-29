import { Migrations } from 'meteor/rocketchat:migrations';
import { Subscriptions } from 'meteor/rocketchat:models';

Migrations.add({
	version: 142,
	up() {
		Subscriptions.model.rawCollection().update({
			t: 'd',
		}, {
			$set: {
				uploadsState: 'acceptedAll',
			},
			$unset: {
				isUploadsAccepted: '',
			},
		}, {
			multi: true,
		});
	},
});
