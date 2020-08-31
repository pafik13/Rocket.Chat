import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { hasRole } from 'meteor/rocketchat:authorization';
import * as Models from 'meteor/rocketchat:models';
import { Logger } from 'meteor/rocketchat:logger';
const logger = new Logger('processHeavyQuery', {});

const { LongTasks } = Models;
const { heavyQueries, maxRecordForProcess } = LongTasks[LongTasks.origin];

Meteor.methods({
	processHeavyQuery(heavyQueryId, longTaskId) {
		if (!hasRole(this.userId, 'admin')) {
			throw new Meteor.Error('error-access-denied', 'You must be a admin!');
		}

		this.unblock();
		check(heavyQueryId, String);
		Match.Maybe(longTaskId, String);

		if (!longTaskId) {
			return LongTasks.create({
				callerId: this.userId,
				method: 'processHeavyQuery',
				params: [heavyQueryId],
			});
		}

		const heavyQuery = heavyQueries.findOne(heavyQueryId);
		logger.debug(heavyQuery);

		for (const model of Object.values(Models)) {
			if (model.name && model.name === heavyQuery.model) {
				logger.debug(model.name);
				switch (heavyQuery.action) {
					case 'update': {
						let query = JSON.parse(heavyQuery.query);
						logger.debug(query);
						query._id = { $nin: heavyQuery.excludedIds };
						const findOptions = { fields: { _id: 1 }, sort: { _updatedAt: -1 }, limit: maxRecordForProcess };
						let records = model.find(query, findOptions).fetch() || [];
						if (!Array.isArray(records)) {
							records = [records];
						}
						const ids = records.map((item) => item._id);
						query = {
							_id: {
								$in: ids,
							},
						};
						logger.debug(query);
						const update = JSON.parse(heavyQuery.update);
						const options = JSON.parse(heavyQuery.options || '{ "multi": true }');
						options.limit = maxRecordForProcess;
						const result = model.update(query, update, options);
						logger.debug(result);
						heavyQueries.update(heavyQueryId, { $addToSet: { excludedIds: { $each: ids } } });
						LongTasks.setExec(longTaskId, result < maxRecordForProcess);
						break;
					}
					case 'remove': {
						const query = JSON.parse(heavyQuery.query);
						logger.debug(query);
						const options = { limit: maxRecordForProcess, sort: { _updatedAt: -1 } };
						const result = model.remove(query, options);
						logger.debug(result);
						LongTasks.setExec(longTaskId, result < maxRecordForProcess);
						break;
					}
					default:
						logger.warn('Unknown action');
				}
			}
		}
	},
});
