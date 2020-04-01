import { check, Match } from 'meteor/check';
import { InstanceStatus } from 'meteor/konecty:multiple-instances-status';
import { Base } from './_Base';

/**
  Model: {
    callerId: string (userId of caller)
    method: string (unique name of group of tasks)
    params: array (paramaraters for task),
    ts: Date (timestamp),
    instanceId: string (id of Rocket instance)
    execs: number (executions count)
  }
  */

class LongTasks extends Base {
	constructor() {
		super('long_tasks');

		this.tryEnsureIndex({ name: 1 });
	}

	// find one
	findOneByID(_id, options) {
		return this.findOne(_id, options);
	}

	// find
	findByMethod(method, options) {
		const query = {
			method,
		};

		return this.find(query, options);
	}

	findByMethodExceptID(method, except, options) {
		const query = {
			_id: { $nin: [except] },
			method,
		};

		return this.find(query, options);
	}

	// update
	setExec(_id, done) {
		check(done, Boolean);

		const update = {
			$inc: { execs: 1 },
			$set: {
				done,
				last: new Date(),
			},
		};

		return this.update({ _id }, update);
	}

	// INSERT
	create(data) {
		check(data, {
			callerId: Match.Maybe(String),
			method: String,
			params: [Match.Any],
			execs: Match.Maybe(Number),
		});
		data.instanceId = InstanceStatus.id();
		data.ts = new Date(),
		data.execs = data.execs || 1;
		data.done = false;
		return this.insert(data);
	}


	// REMOVE
	removeByID(_id) {
		return this.remove(_id);
	}

	getRandomTask() {
		const tasks = Promise.await(this.model.rawCollection().aggregate(
			[{ $match: { instanceId: InstanceStatus.id(), done: false } }, { $sample: { size: 1 } }]
		).toArray());

		return tasks[0];
	}

	getRandomStubTask() {
		const tasks = [{
			method: 'truncateSubscriptions',
			params: ['user123', 10],
		}, {
			method: 'truncateSubscriptions',
			params: ['user123', 10],
			_id: 123,
		}, {
			method: 'truncateSubscriptions',
			params: ['user123', 10],
			_id: true,
		}, {
			method: 'truncateSubscriptions',
			params: ['user123', 10],
			_id: false,
		}, {
			method: 'truncateSubscriptions',
			params: ['user123', 10],
			_id: 'strId',
		},
		];

		return tasks[Math.floor(Math.random() * tasks.length)];
	}
}

export default new LongTasks();
