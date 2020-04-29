import { Meteor } from 'meteor/meteor';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { LongTasks } from 'meteor/rocketchat:models';
import s from 'underscore.string';

Meteor.publish('adminLongTasks', function(filter, limit) {
	if (!this.userId) {
		return this.ready();
	}
	if (hasPermission(this.userId, 'view-room-administration') !== true) {
		return this.ready();
	}

	const options = {
		fields: {
			done: 1,
			method: 1,
			params: 1,
			callerId: 1,
			ts: 1,
			execs: 1,
			last: 1,
			instanceId: 1,
		},
		limit,
		sort: {
			done: 1,
			ts: 1,
			execs: 1,
			last: 1,
		},
	};


	const methodReg = new RegExp(`^${ s.escapeRegExp(s.trim(filter)) }`, 'i');
	return LongTasks.findByMethod(methodReg, options);
});
