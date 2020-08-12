import { Meteor } from 'meteor/meteor';
import { Logger } from 'meteor/rocketchat:logger';
import { SyncedCron } from 'meteor/littledata:synced-cron';
import { statistics } from 'meteor/rocketchat:statistics';
import { randomInteger } from 'meteor/rocketchat:utils';
import { LongTasks, Rooms } from 'meteor/rocketchat:models';
import { elastic } from 'meteor/rocketchat:lib';


const logger = new Logger('SyncedCron');

SyncedCron.config({
	logger(opts) {
		return logger[opts.level].call(logger, opts.message);
	},
	collectionName: 'rocketchat_cron_history',
});

function generateStatistics() {
	statistics.save();
}

// function cleanupOEmbedCache() {
// 	return Meteor.call('OEmbedCacheCleanup');
// }

const MS_PER_MINUTE = 60000;
function updateRoomsInElastic() {
	const till = new Date();
	const from = new Date(till.valueOf() - MS_PER_MINUTE * 1.1);
	logger.debug('updateRoomsInElastic', from, till);
	const rooms = Rooms.findChangedBetweenDates(from, till).fetch();
	elastic.updateRooms(rooms);
}

function markInactiveRooms() {
	return Meteor.call('markInactiveRooms');
}

function doDeactivationsDueToComplaints() {
	return Meteor.call('doDeactivationsDueToComplaints');
}

function cleanupDeactivations() {
	return Meteor.call('cleanupDeactivations');
}

function resumeLongTask() {
	const task = LongTasks.getRandomTask();

	if (task) {
		if (!task.callerId) {
			Meteor.call(task.method, ...task.params, task._id);
		} else {
			Meteor.runAsUser(task.callerId, () => {
				Meteor.call(task.method, ...task.params, task._id);
			});
		}
	}
}

Meteor.startup(function() {
	return Meteor.defer(function() {
		generateStatistics();

		SyncedCron.add({
			name: 'Generate and save statistics',
			schedule(parser) {
				const minutes = randomInteger(0, 59);
				return parser.cron(`${ minutes } * * * *`);
			},
			job: generateStatistics,
		});

		SyncedCron.add({
			name: 'Do Users Deactivations Due To Complaints',
			schedule(parser) {
				return parser.cron('*/1 * * * *');
			},
			job: doDeactivationsDueToComplaints,
		});

		SyncedCron.add({
			name: 'Cleanup Users Deactivations',
			schedule(parser) {
				return parser.cron('*/1 * * * *');
			},
			job: cleanupDeactivations,
		});

		SyncedCron.add({
			name: 'Long Task Execution',
			schedule(parser) {
				return parser.cron('*/1 * * * *');
			},
			job: resumeLongTask,
		});

		SyncedCron.add({
			name: 'Mark Inactive Rooms',
			schedule(parser) {
				return parser.cron('0 1-6 * * *');
			},
			job: markInactiveRooms,
		});

		SyncedCron.add({
			name: 'Update Rooms In Elastic',
			schedule(parser) {
				return parser.cron('*/1 * * * *');
			},
			job: updateRoomsInElastic,
		});

		// SyncedCron.add({
		// 	name: 'Cleanup OEmbed cache',
		// 	schedule(parser) {
		// 		const now = new Date();
		// 		return parser.cron(`${ now.getMinutes() } ${ now.getHours() } * * *`);
		// 	},
		// 	job: cleanupOEmbedCache,
		// });

		return SyncedCron.start();
	});
});
