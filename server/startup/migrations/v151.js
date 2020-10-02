import { Migrations } from 'meteor/rocketchat:migrations';
import { Mongo } from 'meteor/mongo';
import { Users } from 'meteor/rocketchat:models';

export const appTokensCollection = new Mongo.Collection('_raix_push_app_tokens');

Migrations.add({
	version: 151,
	async up() {
		const userCollection = Users.model.rawCollection();
		const cursor = userCollection.find({}, { username: 1 });
		let i = 0;
		let bulk = userCollection.initializeUnorderedBulkOp();
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

			bulk.find({ _id: user._id }).update({
				$set: {
					tokens,
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
