import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { hasRole } from 'meteor/rocketchat:authorization';
import { settings } from 'meteor/rocketchat:settings';
import { Users, Rooms, Subscriptions, LongTasks } from 'meteor/rocketchat:models';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { Logger } from 'meteor/rocketchat:logger';
const logger = new Logger('cleanupSubscriptions', {});

Meteor.methods({
	cleanupSubscriptions(userId, longTaskId) {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		this.unblock();
		check(userId, String);
		Match.Maybe(longTaskId, String);

		const maxLeaves = settings.get('Rooms_Max_Leaves_At_Once') || -1;

		const all = Promise.await(Subscriptions.model.rawCollection().count({ 'u._id': userId }));
		const count = Promise.await(Subscriptions.model.rawCollection().count({ 'u._id': userId, open: true }));
		logger.debug(all, count, maxLeaves);

		if (all <= count) {
			if (longTaskId) {
				LongTasks.setExec(longTaskId, true);
			}
		} else {
			const toLeaves = Math.min(maxLeaves, all - count);
			const closedSubs = Subscriptions.find({ 'u._id': userId, open: false }, { $limit: toLeaves }).fetch();
			logger.debug(all, closedSubs.length, maxLeaves);

			const user = Users.findOneById(userId);
			let deleted = 0; let deletedAll = 0;
			for (let i = 0, closedSub; (i < closedSubs.length) && (deletedAll < toLeaves); i++) {
				closedSub = closedSubs[i];
				try {
					const room = Rooms.findOneById(closedSub.rid);
					logger.debug(user, closedSub, room);

					if (room.t === 'd') {
						deletedAll = deletedAll + Subscriptions.removeByRoomId(closedSub.rid);
						Rooms.removeById(room._id);
					} else {
						deletedAll = deletedAll + Subscriptions.removeByRoomIdAndUserId(closedSub.rid, user._id);
						Meteor.defer(function() {
						// TODO: CACHE: maybe a queue?
							callbacks.run('afterLeaveRoom', { user, subscription: closedSub }, room);
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
					method: 'cleanupSubscriptions',
					params: [userId],
				});
			}
		}
	},
});
