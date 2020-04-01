import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { hasRole } from 'meteor/rocketchat:authorization';
import { settings } from 'meteor/rocketchat:settings';
import { Subscriptions, LongTasks } from 'meteor/rocketchat:models';
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

			for (let i = 0, oldSub; i < oldest.length; i++) {
				oldSub = oldest[i];
				try {
					Meteor.runAsUser(userId, () => {
						Meteor.call('leaveRoom', oldSub.rid);
					});
				} catch (err) {
					logger.error(err);
				}

			}

			if (longTaskId) {
				LongTasks.setExec(longTaskId, count === all - toLeaves);
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
