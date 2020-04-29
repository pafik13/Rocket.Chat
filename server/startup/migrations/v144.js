import { Migrations } from 'meteor/rocketchat:migrations';
import { Subscriptions, BlockedUsers } from 'meteor/rocketchat:models';

Migrations.add({
	version: 144,
	up() {
		const subs = Subscriptions.find({
			blocker: true,
		}, {
			fields: {
				u: 1,
				i: 1,
			},
		});

		subs.forEach((sub) => {
			BlockedUsers.createRecord(sub.u._id, sub.i._id);
		});
	},
});
