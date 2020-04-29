import { Base } from './_Base';

export class BlockedUsers extends Base {
	constructor(...args) {
		super(...args);
		this.tryEnsureIndex({ blocker: 1, blocked: 1 }, { unique: 1 });
	}

	isUserBlocked(blocker, blocked) {
		const record = this.findOne({ blocker, blocked }, {});
		return !!record;
	}

	createRecord(blocker, blocked, reason) {
		const data = { blocker, blocked, ts: new Date(), reason };
		if (!this.isUserBlocked(blocker, blocked)) {
			this.insert(data);
		}
	}

	deleteRecord(blocker, blocked) {
		this.remove({ blocker, blocked });
	}

	findByUserIds(userIds, options) {
		const query = {
			$or: [{
				blocked: userIds[0],
				blocker: userIds[1],
			}, {
				blocked: userIds[1],
				blocker: userIds[0],
			}],
		};
		return this.findOne(query, options);
	}
}

export default new BlockedUsers('blocked_users');
