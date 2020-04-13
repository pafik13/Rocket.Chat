import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { check } from 'meteor/check';
import { composeMessageObjectWithUser } from 'meteor/rocketchat:utils';
import { Messages, Subscriptions } from 'meteor/rocketchat:models';

const subscriptionsByRoomId = {};

Meteor.publish('allMessages', function() {
	if (!this.userId) {
		return this.ready();
	}

	const subscription = this;
	subscription.subId = Random.id();
	subscription.roomIds = [];

	//   console.log('allMessages', subscription);

	const userRoomSubs = Subscriptions.findByUserId(this.userId).fetch();

	//   console.log('allMessages', userRoomSubs);

	userRoomSubs.forEach((s) => {
		if (!subscriptionsByRoomId[s.rid]) {
			subscriptionsByRoomId[s.rid] = {};
		}
		subscriptionsByRoomId[s.rid][subscription.subId] = subscription;

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
			const subs = subscriptionsByRoomId[record.rid];
			if (!subs) { return; }

			const subIds = Object.keys(subs);
			if (!subIds.length) { return; }
			subIds.forEach((subId) => {
				const subscription = subs[subId];
				subscription.added('chat_message', _id, composeMessageObjectWithUser(record, subscription.userId));
			});
			return;
		},
		changed(_id, record) {
			const subs = subscriptionsByRoomId[record.rid];
			if (!subs) { return; }

			const subIds = Object.keys(subs);
			if (!subIds.length) { return; }
			subIds.forEach((subId) => {
				const subscription = subs[subId];
				subscription.changed('chat_message', _id, composeMessageObjectWithUser(record, subscription.userId));
			});
			return;
		},
	});

	this.ready();

	return this.onStop(function() {
		//     console.log('allMessages - onStop', subscriptionsByRoomId)
		cursorHandle.stop();
		const { subId, roomIds } = subscription;
		roomIds.forEach((rid) => {
			delete subscriptionsByRoomId[rid][subId];
		});
		//     console.log('allMessages - onStop', subscriptionsByRoomId)
	});
});
