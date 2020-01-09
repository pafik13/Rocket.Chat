import { Meteor } from 'meteor/meteor';
import { Logger } from 'meteor/rocketchat:logger';
import { SyncedCron } from 'meteor/littledata:synced-cron';
import { statistics } from 'meteor/rocketchat:statistics';
import { randomInteger } from 'meteor/rocketchat:utils';

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

function cleanupDeactivations() {
	return Meteor.call('cleanupDeactivations');
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
			name: 'Cleanup Users Deactivations',
			schedule(parser) {
				return parser.cron('*/1 * * * *');
			},
			job: cleanupDeactivations,
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
