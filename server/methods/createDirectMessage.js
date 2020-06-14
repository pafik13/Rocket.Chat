import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { settings } from 'meteor/rocketchat:settings';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { Users, Rooms, Subscriptions } from 'meteor/rocketchat:models';
import { getDefaultSubscriptionPref } from 'meteor/rocketchat:utils';
import { RateLimiter, getRecordAboutBlock } from 'meteor/rocketchat:lib';
import { callbacks } from 'meteor/rocketchat:callbacks';

Meteor.methods({
	createDirectMessage(username) {
		check(username, String);
		const now = new Date();

		const callerId = Meteor.userId();

		if (!callerId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'createDirectMessage',
			});
		}

		const me = Meteor.user();

		if (!me.username) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'createDirectMessage',
			});
		}

		if (settings.get('Message_AllowDirectMessagesToYourself') === false && me.username === username) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'createDirectMessage',
			});
		}

		if (!hasPermission(callerId, 'create-d')) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', {
				method: 'createDirectMessage',
			});
		}

		const to = Users.findOneByUsername(username);

		if (!to) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				method: 'createDirectMessage',
			});
		}

		if (!hasPermission(to._id, 'view-d-room')) {
			throw new Meteor.Error('error-not-allowed', 'Target user not allowed to receive messages', {
				method: 'createDirectMessage',
			});
		}

		const block = getRecordAboutBlock([to._id, me._id]);

		let hasBlock = false;
		if (block) {
			if (block.blocker === me._id) {
				hasBlock = true;
			} else {
				throw new Meteor.Error('error-not-allowed', 'You are blocked by target user', {
					method: 'createDirectMessage',
				});
			}
		}

		const rid = [me._id, to._id].sort().join('');

		const room = Rooms.findOneById(rid);

		if (room) {
			Rooms.update({
				_id: rid,
			}, {
				$set: {
					usernames: [me.username, to.username],
				} });

			const result = Subscriptions.update({
				rid,
				'u._id': me._id,
			},
			{ $set: {
				ls: now,
				open: true,
			} });

			// Если у меня нет подписки, но я не заблокирован собеседником,
			// то почему бы не создать её и попробовать продолжить общение?
			// Как такое вышло: я вышел из диалога (пожаловавшись или заблокировав)
			if (!result) {
				const isNeedAcceptUploads = settings.get('Message_Need_Accept_Uploads');
				const myDefaultSubscriptionPref = getDefaultSubscriptionPref(me, 'd');
				if (!isNeedAcceptUploads) {
					myDefaultSubscriptionPref.uploadsState = 'acceptedAll';
				}

				Subscriptions.insert({
					ls: now,
					open: true,
					rid,
					fname: to.name,
					name: to.username,
					t: 'd',
					alert: false,
					unread: 0,
					userMentions: 0,
					groupMentions: 0,
					customFields: to.customFields,
					i: {
						_id: to._id,
						username: to.username,
					},
					u: {
						_id: me._id,
						username: me.username,
					},
					ts: now,
					...myDefaultSubscriptionPref,
				});
			}

			return { rid };
		}

		const roomsMaxDirects = settings.get('Rooms_Maximum_Directs');

		if (roomsMaxDirects) {
			const meSubsCount = Promise.await(Subscriptions.countDirectsByUserId(me._id));
			if (meSubsCount >= roomsMaxDirects) {
				throw new Meteor.Error('error-not-allowed', `You have reached the maximum number of direct messages: ${ roomsMaxDirects }`, {
					method: 'createDirectMessage',
				});
			}

			const toSubsCount = Promise.await(Subscriptions.countDirectsByUserId(to._id));
			if (toSubsCount >= roomsMaxDirects) {
				throw new Meteor.Error('error-not-allowed', `Your interlocutor has reached the maximum number of direct messages: ${ roomsMaxDirects }`, {
					method: 'createDirectMessage',
				});
			}
		}

		Rooms.insert({
			_id: rid,
			t: 'd',
			msgs: 0,
			ts: now,
			usersCount: 2,
			usernames: [me.username, to.username],
		});

		const isNeedAcceptUploads = settings.get('Message_Need_Accept_Uploads');
		const myDefaultSubscriptionPref = getDefaultSubscriptionPref(me, 'd');
		if (!isNeedAcceptUploads) {
			myDefaultSubscriptionPref.uploadsState = 'acceptedAll';
		}

		Subscriptions.insert({
			ls: now,
			open: true,
			rid,
			fname: to.name,
			name: to.username,
			t: 'd',
			alert: false,
			unread: 0,
			userMentions: 0,
			groupMentions: 0,
			customFields: to.customFields,
			i: {
				_id: to._id,
				username: to.username,
			},
			u: {
				_id: me._id,
				username: me.username,
			},
			ts: now,
			...myDefaultSubscriptionPref,
		});

		const toDefaultSubscriptionPref = getDefaultSubscriptionPref(to, 'd');
		if (!isNeedAcceptUploads) {
			toDefaultSubscriptionPref.uploadsState = 'acceptedAll';
		}

		Subscriptions.insert({
			rid,
			fname: me.name,
			name: me.username,
			t: 'd',
			open: false,
			alert: false,
			unaccepted: true,
			unread: 0,
			userMentions: 0,
			groupMentions: 0,
			customFields: me.customFields,
			i: {
				_id: me._id,
				username: me.username,
			},
			u: {
				_id: to._id,
				username: to.username,
			},
			ts: now,
			...toDefaultSubscriptionPref,
		});

		if (hasBlock) {
			Meteor.call('blockUser', { rid, blocked: block.blocked, reason: block.reason });
		}

		const insertedRoom = Rooms.findOneById(rid);

		console.log(insertedRoom);

		callbacks.run('afterCreateDirectRoom', insertedRoom, { from: me, to });

		return {
			rid,
		};
	},
});

RateLimiter.limitMethod('createDirectMessage', 10, 60000, {
	userId(userId) {
		return !hasPermission(userId, 'send-many-messages');
	},
});
