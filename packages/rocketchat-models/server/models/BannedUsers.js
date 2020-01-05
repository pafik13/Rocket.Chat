import { Base } from './_Base';

export class BannedUsers extends Base {
	constructor(...args) {
		super(...args);
		this.tryEnsureIndex({ rid: 1, userId: 1 }, { unique: 1 });
	}

	isUserIsBanned(rid, userId) {
		const record = this.findOne({ rid, userId }, {});
		return !!record;
	}

	createRecord(rid, userId) {
		const data = { rid, userId };
		if (!this.isUserIsBanned(rid, userId)) {
			this.insert(data);
		}
	}

	deleteRecord(rid, userId) {
		this.remove({ rid, userId });
	}

	findByRoomId(roomId, options) {
		const query = { rid: roomId };

		return this.find(query, options);
	}
}

export default new BannedUsers('banned_users');
