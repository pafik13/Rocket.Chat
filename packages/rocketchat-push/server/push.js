import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { Mongo } from 'meteor/mongo';
import _ from 'underscore';
import { nats } from 'meteor/rocketchat:models';

import { logger } from './logger';

export const _matchToken = Match.OneOf({ apn: String }, { gcm: String });
export const appTokensCollection = new Mongo.Collection('_raix_push_app_tokens');

appTokensCollection._ensureIndex({ userId: 1 });

export class PushClass {
	
	configure(options) {
		// https://npmjs.org/package/apn

		// After requesting the certificate from Apple, export your private key as
		// a .p12 file anddownload the .cer file from the iOS Provisioning Portal.

		// gateway.push.apple.com, port 2195
		// gateway.sandbox.push.apple.com, port 2195

		// Now, in the directory containing cert.cer and key.p12 execute the
		// following commands to generate your .pem files:
		// $ openssl x509 -in cert.cer -inform DER -outform PEM -out cert.pem
		// $ openssl pkcs12 -in key.p12 -out key.pem -nodes

		logger.debug('Configure', options);
	}

	// This is a general function to validate that the data added to notifications
	// is in the correct format. If not this function will throw errors
	_validateDocument(notification) {
		// Check the general notification
		check(notification, {
			from: String,
			title: String,
			text: String,
			sent: Match.Optional(Boolean),
			sending: Match.Optional(Match.Integer),
			badge: Match.Optional(Match.Integer),
			sound: Match.Optional(String),
			notId: Match.Optional(Match.Integer),
			contentAvailable: Match.Optional(Match.Integer),
			forceStart: Match.Optional(Match.Integer),
			apn: Match.Optional({
				from: Match.Optional(String),
				title: Match.Optional(String),
				text: Match.Optional(String),
				badge: Match.Optional(Match.Integer),
				sound: Match.Optional(String),
				notId: Match.Optional(Match.Integer),
				actions: Match.Optional([Match.Any]),
				category: Match.Optional(String),
				pushType: Match.Optional(String),
			}),
			gcm: Match.Optional({
				from: Match.Optional(String),
				title: Match.Optional(String),
				text: Match.Optional(String),
				image: Match.Optional(String),
				style: Match.Optional(String),
				summaryText: Match.Optional(String),
				picture: Match.Optional(String),
				badge: Match.Optional(Match.Integer),
				sound: Match.Optional(String),
				notId: Match.Optional(Match.Integer),
			}),
			android_channel_id: Match.Optional(String),
			userId: String,
			payload: Match.Optional(Object),
			delayUntil: Match.Optional(Date),
			createdAt: Date,
			createdBy: Match.OneOf(String, null),
		});

		if (!notification.userId) {
			throw new Error('No userId found');
		}
	}
	
	send(options) {
		// If on the client we set the user id - on the server we need an option
		// set or we default to "<SERVER>" as the creator of the notification
		// If current user not set see if we can set it to the logged in user
		// this will only run on the client if Meteor.userId is available
		const currentUser = options.createdBy || '<SERVER>';

		// Rig the notification object
		const notification = Object.assign({
			createdAt: new Date(),
			createdBy: currentUser,
			sent: false,
			sending: 0,
		}, _.pick(options, 'from', 'title', 'text', 'userId'));

		// Add extra
		Object.assign(notification, _.pick(options, 'payload', 'badge', 'sound', 'notId', 'delayUntil', 'android_channel_id'));

		if (Match.test(options.apn, Object)) {
			notification.apn = _.pick(options.apn, 'from', 'title', 'text', 'badge', 'sound', 'notId', 'category', 'pushType');
		}

		if (Match.test(options.gcm, Object)) {
			notification.gcm = _.pick(options.gcm, 'image', 'style', 'summaryText', 'picture', 'from', 'title', 'text', 'badge', 'sound', 'notId', 'actions', 'android_channel_id');
		}

		if (options.contentAvailable != null) {
			notification.contentAvailable = options.contentAvailable;
		}

		if (options.forceStart != null) {
			notification.forceStart = options.forceStart;
		}

		try {
			this._validateDocument(notification);
			nats.publish('notifications', notification);
		} catch (error) {
			logger.debug(`Could not send notification, Error: ${ error.message }`);
			logger.debug(error.stack);
		}
	}
}

export const Push = new PushClass();
