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
				doc = docs[i];
				if (doc.token) {
					const { token } = doc;
					if (token.apn || token.gcm) {
						let value; let type;

						if (token.apn) {
							value = token.apn;
							type = 'APN';
						} else {
							value = token.gcm;
							type = 'GCM';
						}

						const { _id, appName, enabled, updatedAt, createdAt } = doc;

						tokens.push({
							_id, value, type, appName, enabled, updatedAt, createdAt,
						});
					}
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
