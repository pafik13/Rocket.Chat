import { Meteor } from 'meteor/meteor';
// import { Random } from 'meteor/random';
// import { check } from 'meteor/check';
import { composeMessageObjectWithUser } from 'meteor/rocketchat:utils';
import { Messages, Subscriptions } from 'meteor/rocketchat:models';

const subscriptionsByRoomId = new Map();

Meteor.publish('allMessages', function() {
	if (!this.userId) {
		return this.ready();
	}

	const subscription = this;
	/* subscription.subId = Random.id();*/
	subscription.roomIds = [];

	//   console.log('allMessages', subscription);

	const userRoomSubs = Subscriptions.findByUserId(this.userId).fetch();

	//   console.log('allMessages', userRoomSubs);

	userRoomSubs.forEach((s) => {
		if (!subscriptionsByRoomId.has(s.rid)) {
			subscriptionsByRoomId.set(s.rid, new Map());
		}
		const map = subscriptionsByRoomId.get(s.rid);
		map.set(subscription, subscription);
		//     [subscription.subId] = subscription;

		subscription.roomIds.push(s.rid);
	});

	const cursor = Messages.find({}, {
		sort: {
			ts: -1,
		},
		limit: 50,
	});

	const cursorHandle = cursor.observeChanges({
		added(_id, record) {
			const subs = subscriptionsByRoomId.get(record.rid);
			if (!subs) { return; }

			for (const subscription of subs.values()) {
				subscription.added('chat_message', _id, composeMessageObjectWithUser(record, subscription.userId));
			}
			return;
		},
		changed(_id, record) {
			const subs = subscriptionsByRoomId.get(record.rid);
			if (!subs) { return; }

			for (const subscription of subs.values()) {
				subscription.changed('chat_message', _id, composeMessageObjectWithUser(record, subscription.userId));
			}
			return;
		},
	});

	this.ready();

	return this.onStop(function() {
		//     console.log('allMessages - onStop', subscriptionsByRoomId)
		cursorHandle.stop();
		const { /* subId, */ roomIds } = subscription;
		roomIds.forEach((rid) => {
			const map = subscriptionsByRoomId.get(rid);
			map.delete(subscription);

			if (!map.size) { subscriptionsByRoomId.delete(rid); }
		});
		//     console.log('allMessages - onStop', subscriptionsByRoomId)
	});
});
