import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { Users } from 'meteor/rocketchat:models';
import { Random } from 'meteor/random';
import { Logger } from 'meteor/rocketchat:logger';

const logger = new Logger('Push_tokens');
const _matchToken = Match.OneOf({ apn: String }, { gcm: String });

/**
 * Token:
 *   _id
 *   value
 *   type
 *   appName
 *   enabled
 *   createdAt
 *   updatedA
 */

Meteor.methods({
	'raix:push-update'(options) {
		logger.debug('Got push token from app:', options);

		check(options, {
			id: Match.Optional(String),
			token: _matchToken,
			appName: String,
			userId: Match.OneOf(String, null),
			metadata: Match.Optional(Object),
		});

		// The if user id is set then user id should match on client and connection
		if (options.userId && options.userId !== this.userId) {
			throw new Meteor.Error(403, 'Forbidden access');
		}

		let doc;

		// lookup app by id if one was included
		if (options.id) {
			const user = Users.findOne({ _id: this.userId, tokens: { _id: options.id } }, { projection: { 'tokens.$': 1 } });
			if (user) { doc = user.tokens[0]; }
		}

		// No doc was found - we check the database to see if
		// we can find a match for the app via token and appName
		let value; let type;
		const { token } = options;
		if (token.apn) {
			value = token.apn;
			type = 'APN';
		} else {
			value = token.gcm;
			type = 'GCM';
		}

		if (!doc) {
			const user = Users.findOne({ _id: this.userId, tokens: { value, appName: options.appName } }, { fields: { 'tokens.$': 1 } });
			if (user) { doc = user.tokens[0]; }
		}

		// if we could not find the id or token then create it
		if (!doc) {
			// Rig default doc
			doc = {
				value,
				type,
				appName: options.appName,
				enabled: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// XXX: We might want to check the id - Why isnt there a match for id
			// in the Meteor check... Normal length 17 (could be larger), and
			// numbers+letters are used in Random.id() with exception of 0 and 1
			doc._id = options.id || Random.id();
			// The user wanted us to use a specific id, we didn't find this while
			// searching. The client could depend on the id eg. as reference so
			// we respect this and try to create a document with the selected id;
			Users.update({ _id: this.userId }, { $push: { tokens: doc } });
		} else {
			// We found the app so update the updatedAt and set the token
			Users.update({ _id: this.userId, 'tokens._id': doc._id }, {
				$set: {
					'tokens.$.updatedAt':  new Date(),
					'tokens.$.value': value,
					'tokens.$.type': type,
				},
			});
		}

		logger.debug('updated', doc);

		// Return the doc we want to use
		return doc;
	},
	// Deprecated
	'raix:push-setuser'(id) {
		check(id, String);

		logger.debug(`Settings userId "${ this.userId }" for app:`, id);
		const user = Users.findOne({ tokens: { _id: id } }, { fields: { 'tokens.$': 1 } });
		const [doc] = user.tokens;

		if (doc) {
			Users.update({ _id: user._id }, { $pull: { tokens: { _id: id } } });
			Users.update({ _id: this.userId }, { $push: { tokens: doc } });
		}

		return !!doc;
	},
});
