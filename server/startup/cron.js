import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { Logger } from 'meteor/rocketchat:logger';
import { SyncedCron } from 'meteor/littledata:synced-cron';
import { statistics } from 'meteor/rocketchat:statistics';
import { settings } from 'meteor/rocketchat:settings';

const logger = new Logger('SyncedCron');

SyncedCron.config({
	logger(opts) {
		return logger[opts.level].call(logger, opts.message);
	},
	collectionName: 'rocketchat_cron_history',
});

function generateStatistics() {
	const cronStatistics = statistics.save();

	cronStatistics.host = Meteor.absoluteUrl();

	if (settings.get('Statistics_reporting')) {
		try {
			const headers = {};

			HTTP.post('https://collector.rocket.chat/', {
				data: cronStatistics,
				headers,
			});
		} catch (error) {
			/* error*/
			logger.warn('Failed to send usage report');
		}
	}
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
				return parser.cron(`${ new Date().getMinutes() } * * * *`);
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
