import { Meteor } from 'meteor/meteor';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { Subscriptions, Users } from 'meteor/rocketchat:models';
import s from 'underscore.string';

Meteor.publish('adminSubscriptions', function(search, limit) {
	if (!this.userId) {
		return this.ready();
	}
	if (hasPermission(this.userId, 'view-room-administration') !== true) {
		return this.ready();
	}
	const steps = [
		{
			$group: {
				_id: '$u._id',
				count: {
					$sum: 1,
				},
			},
		}, {
			$sort: {
				count: -1,
			},
		}, {
			$limit: limit,
		},
	];

	if (search) {
		const usernameReg = new RegExp(`^${ s.escapeRegExp(search) }`, 'i');
		steps.unshift({
			$match: {
				'u.username': usernameReg,
			},
		});
	}
	const userSubs = Promise.await(Subscriptions.model.rawCollection().aggregate(steps).toArray());

	const users = userSubs.reduce((acc, cur) => { acc[cur._id] = { total: cur.count }; return acc; }, {});

	const userSubsByTypes = Promise.await(Subscriptions.model.rawCollection().aggregate([
		{
			$match: {
				'u._id': {
					$in: Object.keys(users),
				},
			},
		}, {
			$group: {
				_id: {
					userId: '$u._id',
					roomType: '$t',
				},
				count: {
					$sum: 1,
				},
			},
		},
	]).toArray());

	for (let i = 0; i < userSubsByTypes.length; i++) {
		const item = userSubsByTypes[i];
		switch (item._id.roomType) {
			case 'd': {
				users[item._id.userId].direct = item.count;
				break;
			}
			case 'c': {
				users[item._id.userId].channel = item.count;
				break;
			}
			case 'p': {
				users[item._id.userId].private = item.count;
				break;
			}
		}
	}

	const options = {
		fields: {
			name: 1,
			username:1,
			status: 1,
			active: 1,
			roles: 1,
		},
	};

	const query = {
		_id: { $in: Object.keys(users) },
	};

	const handle = Users.find(query, options).observeChanges({
		added: (id, record) => {
			this.added('admin_subscriptions', id, Object.assign({}, record, users[id]));
			this.added('users', id, record);
		},

		removed: (id) => {
			this.removed('admin_subscriptions', id);
			this.added('users', id);
		},
	});

	this.ready();

	// Stop observing the cursor when the client unsubscribes. Stopping a
	// subscription automatically takes care of sending the client any `removed`
	// messages.
	this.onStop(() => handle.stop());

	return;
});
