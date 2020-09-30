import { Migrations } from 'meteor/rocketchat:migrations';
import { Users, Subscriptions } from 'meteor/rocketchat:models';
import { subscriptionNotificationPreferencesProjection } from 'meteor/rocketchat:lib';

Migrations.add({
	version: 150,
	async up() {
		const cursor = Users.model.rawCollection().find({}, { username: 1 });
		while (await cursor.hasNext()) {
			// load one document from the resultset into memory
			const user = await cursor.next();
			const subs = await Subscriptions.model.rawCollection().find({ 'u._id': user._id }, {
				projection: subscriptionNotificationPreferencesProjection,
			}).toArray();
			Users.update(user._id, {
				$set: {
					subscriptions: subs,
				},
			});
		}
	},
});
