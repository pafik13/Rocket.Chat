import { Meteor } from 'meteor/meteor';
import { DDPCommon } from 'meteor/ddp-common';
import { Subscriptions, Rooms } from 'meteor/rocketchat:models';

const userNotificationEvents = ['audioNotification', 'notification'];

const changedPayload = function(collection, id, fields) {
	return DDPCommon.stringifyDDP({
		msg: 'changed',
		collection,
		id,
		fields,
	});
};
const send = function(self, msg) {
	if (!self.socket) {
		return;
	}
	self.socket.send(msg);
};
class RoomStreamer extends Meteor.Streamer {
	addSubscription(subscription, eventName) {
		super.addSubscription(subscription, eventName);
		const [userId, event] = eventName.split('/');
		if (userNotificationEvents.includes(event)) {
			Meteor.users.update(userId, { $set: { isSubscribedOnNotifications: true } });
		}
	}

	removeSubscription(subscription, eventName) {
		super.removeSubscription(subscription, eventName);
		const [userId, event] = eventName.split('/');
		if (userNotificationEvents.includes(event)) {
			Meteor.users.update(userId, { $set: { isSubscribedOnNotifications: false } });
		}
	}

	_publish(publication, eventName, options) {
		super._publish(publication, eventName, options);
		const uid = Meteor.userId();
		if (/rooms-changed/.test(eventName)) {
			const roomEvent = (...args) => send(publication._session, changedPayload(this.subscriptionName, 'id', {
				eventName: `${ uid }/rooms-changed`,
				args,
			}));
			const rooms = Subscriptions.find({ 'u._id': uid }, { fields: { rid: 1 } }).fetch();
			rooms.forEach(({ rid }) => {
				this.on(rid, roomEvent);
			});

			const userEvent = (clientAction, { rid }) => {
				switch (clientAction) {
					case 'inserted':
						rooms.push({ rid });
						this.on(rid, roomEvent);
						break;

					case 'removed':
						this.removeListener(rid, roomEvent);
						break;
				}
			};
			this.on(uid, userEvent);

			publication.onStop(() => {
				this.removeListener(uid, userEvent);
				rooms.forEach(({ rid }) => this.removeListener(rid, roomEvent));
			});
		}
	}
}

const printStreamRoomSubsStat = (streamRoom) => {
	console.log('publication.onStop is called');
	console.log('Subscriptions stats:');
	console.log(`  subs len: "${ streamRoom.subscriptions.length }"`);
	const keys = Object.keys(streamRoom.subscriptionsByEventName);
	console.log(`  subs by name keys cnt: "${ keys.length }"`);
	let count = 0;
	for (const key of keys.sort()) {
		count += streamRoom.subscriptionsByEventName[key].length;
		// 							console.log(`  ${ key }: ${ streamRoom.subscriptionsByEventName[key].length }`);
	}
	console.log(`  subs by name all cnt: "${ count }"`);
};

class Notifications {
	constructor() {
		const self = this;
		this.debug = false;
		this.notifyUser = this.notifyUser.bind(this);
		this.streamAll = new Meteor.Streamer('notify-all');
		this.streamLogged = new Meteor.Streamer('notify-logged');
		this.streamRoom = new Meteor.Streamer('notify-room');
		this.streamRoom.$sessionsMap = new WeakMap();
		const originalPublish = this.streamRoom._publish.bind(this.streamRoom);
		this.streamRoom._publish = (publication, eventName, options) => {
			const e = eventName.split('/')[1];
			if (e === 'typing') {
				if (publication._session && publication._session.userId) {
					const session = publication._session;
					if (!this.streamRoom.$sessionsMap.has(session)) {
						// 					console.log('!this.streamRoom.$sessionsMap.has(session)');
						const cursorHandle = Subscriptions.findOpenedByUserId(session.userId, { fields: { rid: 1 } }).observe({
							added(sub) {
								console.log('cursorHandle.added is called');
								originalPublish(publication, `${ sub.rid }/${ e }`, options);
							},
							removed(oldSub) {
								console.log(`cursorHandle.removed is called: rid=${ oldSub.rid } _id=${ oldSub._id }`);
							},
						});
						publication.onStop(() => {
							this.streamRoom.$sessionsMap.delete(session);
							cursorHandle.stop();
							printStreamRoomSubsStat(this.streamRoom);
						});
						this.streamRoom.$sessionsMap.set(session, true);
						printStreamRoomSubsStat(this.streamRoom);
						return;
					}
				} else {
					console.log('Invalid typing subscription:');
					console.log(`  session: "${ publication._session.id }"`);
					console.log(`  userId: "${ publication._session && publication._session.userId }"`);
				}
			} else {
				originalPublish(publication, eventName, options);
			}
		};

		// 		const rooms = Rooms.find({}, { name: 1 }).fetch();
		// 		rooms.forEach((room) => {
		// 			self.streamRoom.on(`${ room._id }/typing`, function(...args) {
		// 				console.log(`RocketChat.Notifications: action=[${ room._id }/typing] with args=[${ args }]`);
		// 			});
		// 		});

		this.streamRoomUsers = new Meteor.Streamer('notify-room-users');
		this.streamUser = new RoomStreamer('notify-user');
		this.streamAll.allowWrite('none');
		this.streamLogged.allowWrite('none');
		this.streamRoom.allowWrite('none');
		this.streamRoomUsers.allowWrite(function(eventName, ...args) {
			const [roomId, e] = eventName.split('/');
			// const user = Meteor.users.findOne(this.userId, {
			// 	fields: {
			// 		username: 1
			// 	}
			// });
			if (Subscriptions.findOneByRoomIdAndUserId(roomId, this.userId) != null) {
				const subscriptions = Subscriptions.findByRoomIdAndNotUserId(roomId, this.userId).fetch();
				subscriptions.forEach((subscription) => self.notifyUser(subscription.u._id, e, ...args));
			}
			return false;
		});
		this.streamUser.allowWrite('logged');
		this.streamAll.allowRead('all');
		this.streamLogged.allowRead('logged');
		this.streamRoom.allowRead(function(eventName, extraData) {
			const [roomId] = eventName.split('/');
			const room = Rooms.findOneById(roomId);
			if (!room) {
				console.warn(`Invalid streamRoom eventName: "${ eventName }"`);
				return false;
			}
			if (room.t === 'l' && extraData && extraData.token && room.v.token === extraData.token) {
				return true;
			}
			if (this.userId == null) {
				return false;
			}
			const subscription = Subscriptions.findOneByRoomIdAndUserId(roomId, this.userId, { fields: { _id: 1 } });
			return subscription != null;
		});
		this.streamRoomUsers.allowRead('none');
		this.streamUser.allowRead(function(eventName) {
			const [userId] = eventName.split('/');
			return (this.userId != null) && this.userId === userId;
		});
	}

	notifyAll(eventName, ...args) {
		if (this.debug === true) {
			console.log('notifyAll', [eventName, ...args]);
		}
		args.unshift(eventName);
		return this.streamAll.emit.apply(this.streamAll, args);
	}

	notifyLogged(eventName, ...args) {
		if (this.debug === true) {
			console.log('notifyLogged', [eventName, ...args]);
		}
		args.unshift(eventName);
		return this.streamLogged.emit.apply(this.streamLogged, args);
	}

	notifyRoom(room, eventName, ...args) {
		if (this.debug === true) {
			console.log('notifyRoom', [room, eventName, ...args]);
		}
		args.unshift(`${ room }/${ eventName }`);
		return this.streamRoom.emit.apply(this.streamRoom, args);
	}

	notifyUser(userId, eventName, ...args) {
		if (this.debug === true) {
			console.log('notifyUser', [userId, eventName, ...args]);
		}
		args.unshift(`${ userId }/${ eventName }`);
		return this.streamUser.emit.apply(this.streamUser, args);
	}

	notifyAllInThisInstance(eventName, ...args) {
		if (this.debug === true) {
			console.log('notifyAll', [eventName, ...args]);
		}
		args.unshift(eventName);
		return this.streamAll.emitWithoutBroadcast.apply(this.streamAll, args);
	}

	notifyLoggedInThisInstance(eventName, ...args) {
		if (this.debug === true) {
			console.log('notifyLogged', [eventName, ...args]);
		}
		args.unshift(eventName);
		return this.streamLogged.emitWithoutBroadcast.apply(this.streamLogged, args);
	}

	notifyRoomInThisInstance(room, eventName, ...args) {
		if (this.debug === true) {
			console.log('notifyRoomAndBroadcast', [room, eventName, ...args]);
		}
		args.unshift(`${ room }/${ eventName }`);
		return this.streamRoom.emitWithoutBroadcast.apply(this.streamRoom, args);
	}

	notifyUserInThisInstance(userId, eventName, ...args) {
		if (this.debug === true) {
			console.log('notifyUserAndBroadcast', [userId, eventName, ...args]);
		}
		args.unshift(`${ userId }/${ eventName }`);
		return this.streamUser.emitWithoutBroadcast.apply(this.streamUser, args);
	}
}

const notifications = new Notifications();

notifications.streamRoom.allowWrite(function(eventName, username, typing, extraData) {
	const [roomId, e] = eventName.split('/');

	if (e === 'webrtc') {
		return true;
	}
	if (e === 'typing') {
		// typing from livechat widget
		if (extraData && extraData.token) {
			const room = Rooms.findOneById(roomId);
			if (room && room.t === 'l' && room.v.token === extraData.token) {
				return true;
			}
		}

		if (!this.userId) {
			return false;
		}

		return true;
	}
	return false;
});

export default notifications;
