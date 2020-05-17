import { Base } from './_Base';

export class Complaints extends Base {
	constructor(...args) {
		super(...args);
		this.tryEnsureIndex({ t:1, ts: 1, active: 1 }, { partialFilterExpression: { active: true } });
		this.tryEnsureIndex({ t: 1, reason: 1 });
		this.tryEnsureIndex({ creatorId:1, roomId: 1, reason:1, active: 1 }, { unique: 1, partialFilterExpression: { roomId: { $type: 'string' }, active: true } });
		this.tryEnsureIndex({ creatorId:1, userId: 1, reason:1, active: 1 }, { unique: 1, partialFilterExpression: { userId: { $type: 'string' }, active: true } });
		this.tryEnsureIndex({ roomId: 1 }, { partialFilterExpression: { roomId: { $type: 'string' } } });
		this.tryEnsureIndex({ userId: 1 }, { partialFilterExpression: { userId: { $type: 'string' } } });
	}

	isExistsWithRoomId(creatorId, roomId, reason) {
		const record = this.findOne({ creatorId, roomId, reason, active: true }, {});
		return !!record;
	}

	isExistsWithUserId(creatorId, userId, reason) {
		const record = this.findOne({ creatorId, userId, reason, active: true }, {});
		return !!record;
	}

	createWithRoomId(roomId, reason, creatorId) {
		const data = { t: 'r', ts: new Date(), roomId, reason, creatorId, active: true };
		if (!this.isExistsWithRoomId(creatorId, roomId, reason)) {
			this.insert(data);
		}
	}

	createWithUserId(userId, reason, creatorId) {
		const data = { t: 'u', ts: new Date(), userId, reason, creatorId, active: true };
		if (!this.isExistsWithUserId(creatorId, userId, reason)) {
			this.insert(data);
		}
	}

	deleteWithRoomId(roomId, reason, creatorId) {
		this.remove({ creatorId, roomId, reason });
	}

	deleteWithUserId(userId, reason, creatorId) {
		this.remove({ creatorId, userId, reason });
	}
	// 	findByRoomId(roomId, options) {
	// 		const query = { rid: roomId };

	// 		return this.find(query, options);
	// 	}

	findByTypes(types, options) {
		const query = {
			t: {
				$in: types,
			},
		};

		return this.find(query, options);
	}

	getUserIds(complaintsCount = 1000, limit = 10) {
		const stages = [{
			$match: {
				t: 'u',
				active: true,
			},
		}, {
			$group: {
				_id: '$userId',
				cnt: {
					$sum: 1,
				},
			},
		}, {
			$match: {
				cnt: {
					$gte: complaintsCount,
				},
			},
		}, {
			$limit: limit,
		},
		];

		return Promise.await(this.model.rawCollection().aggregate(stages).toArray());
	}

	setUnactiveByUserId(userId) {
		return this.update({
			userId,
			t: 'u',
			active: true,
		}, { $set: { active: false } }, { multi: true });
	}

	findByTypesAndFromDate(types, from, options) {
		const query = {
			active: true,
			t: {
				$in: types,
			},
			ts: {
				$gte: from,
			},
		};

		return this.find(query, options);
	}
}

export default new Complaints('complaints');
