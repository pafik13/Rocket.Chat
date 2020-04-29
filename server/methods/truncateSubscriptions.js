import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { hasRole } from 'meteor/rocketchat:authorization';
import { settings } from 'meteor/rocketchat:settings';
import { Users, Rooms, Subscriptions, LongTasks } from 'meteor/rocketchat:models';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { Logger } from 'meteor/rocketchat:logger';
const logger = new Logger('truncateSubscriptions', {});

Meteor.methods({
	truncateSubscriptions(userId, count, longTaskId) {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		this.unblock();
		check(userId, String);
		check(count, Number);
		Match.Maybe(longTaskId, String);

		const maxLeaves = settings.get('Rooms_Max_Leaves_At_Once') || -1;

		const all = Promise.await(Subscriptions.model.rawCollection().count({ 'u._id': userId }));
		logger.debug(all, count, maxLeaves);

		if (all <= count) {
			if (longTaskId) {
				LongTasks.setExec(longTaskId, true);
			}
		} else {
			const toLeaves = Math.min(maxLeaves, all - count);
			const oldest = Subscriptions.findNOldestForUser(userId, toLeaves).fetch();
			logger.debug(all, oldest.length, maxLeaves);

			const user = Users.findOneById(userId);
			let deleted = 0; let deletedAll = 0;
			for (let i = 0, oldSub; (i < oldest.length) && (deletedAll < toLeaves); i++) {
				oldSub = oldest[i];
				try {
					// 					Meteor.runAsUser(userId, () => {
					// 						Meteor.call('leaveRoom', oldSub.rid);
					// 					});
					// 					const sub = Subscriptions.findOneById(oldSub._id);
					const room = Rooms.findOneById(oldSub.rid);
					logger.debug(user, oldSub, room);

					if (room.t === 'd') {
						deletedAll = deletedAll + Subscriptions.removeByRoomId(oldSub.rid);
						Rooms.removeById(room._id);
					} else {
						deletedAll = deletedAll + Subscriptions.removeByRoomIdAndUserId(oldSub.rid, user._id);
						Meteor.defer(function() {
						// TODO: CACHE: maybe a queue?
							callbacks.run('afterLeaveRoom', { user, subscription: oldSub }, room);
						});
					}

					deleted++;
				} catch (err) {
					logger.error(err);
				}

			}

			if (longTaskId) {
				LongTasks.setExec(longTaskId, count === (all - deleted));
			} else {
				LongTasks.create({
					callerId: this.userId,
					method: 'truncateSubscriptions',
					params: [userId, count],
				});
			}
		}
	},
});
