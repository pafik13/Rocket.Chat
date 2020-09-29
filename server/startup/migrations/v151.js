import { Migrations } from 'meteor/rocketchat:migrations';
import { Mongo } from 'meteor/mongo';
import { Users } from 'meteor/rocketchat:models';

export const appTokensCollection = new Mongo.Collection('_raix_push_app_tokens');

Migrations.add({
	version: 151,
	async up() {
		const cursor = Users.model.rawCollection().find({}, { username: 1 });
		while (await cursor.hasNext()) {
			// load one document from the resultset into memory
			const user = await cursor.next();
			const docs = await appTokensCollection.rawCollection().find({ userId: user._id }).toArray();

			const tokens = [];
			for (let doc, i = 0; i < docs.length; i++) {
				if (doc.apn || doc.gcm) {
					let value; let type;

					if (doc.apn) {
						value = doc.apn;
						type = 'APN';
					} else {
						value = doc.gcm;
						type = 'GCM';
					}

					tokens.push({
						value,
						type,
						appName: doc.appName,
						enabled: true,
						createdAt: new Date(),
						updatedAt: new Date(),
					});
				}
			}

			Users.update(user._id, {
				$set: {
					tokens,
				},
			});
		}
	},
});
