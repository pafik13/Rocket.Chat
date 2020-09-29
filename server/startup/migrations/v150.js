import { Migrations } from 'meteor/rocketchat:migrations';
import { Users, Subscriptions } from 'meteor/rocketchat:models';

Migrations.add({
	version: 150,
	async up() {
		const cursor = Users.model.rawCollection().find({}, { username: 1 });
		while (await cursor.hasNext()) {
			// load one document from the resultset into memory
			const user = await cursor.next();
			const subs = await Subscriptions.model.rawCollection().find({ 'u._id': user._id }, {
				projection: {
					audioNotifications: 1,
					audioPrefOrigion: 1,
					audioNotificationValue: 1,
					desktopNotificationDuration: 1,
					desktopPrefOrigin: 1,
					desktopNotifications: 1,
					mobilePushNotifications: 1,
					mobilePrefOrigin: 1,
					emailNotifications: 1,
					emailPrefOrigin: 1,
					disableNotifications: 1,
				},
			}).toArray();
			Users.update(user._id, {
				$set: {
					subscriptions: subs,
				},
			});
		}
	},
});
