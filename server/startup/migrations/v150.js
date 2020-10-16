import { Migrations } from 'meteor/rocketchat:migrations';
import { Users, Subscriptions } from 'meteor/rocketchat:models';
import { subscriptionNotificationPreferencesProjection } from 'meteor/rocketchat:lib';

Migrations.add({
	version: 150,
	async up() {
		const userCollection = Users.model.rawCollection();
		const cursor = userCollection.find({}, { username: 1 });
		let i = 0;
		let bulk = userCollection.initializeUnorderedBulkOp();
		while (await cursor.hasNext()) {
			// load one document from the resultset into memory
			const user = await cursor.next();
			const subs = await Subscriptions.model.rawCollection().find({ 'u._id': user._id }, {
				projection: subscriptionNotificationPreferencesProjection,
			}).toArray();
			bulk.find({ _id: user._id }).update({
				$set: {
					subscriptions: subs,
				},
			});
			i++;
			if (i === 1000) {
				await bulk.execute();
				i = 0;
				bulk = userCollection.initializeUnorderedBulkOp();
			}
		}
		await bulk.execute();
	},
});
