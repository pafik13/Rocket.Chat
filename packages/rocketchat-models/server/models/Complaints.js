import { Base } from './_Base';

export class Complaints extends Base {
	constructor(...args) {
		super(...args);
		this.tryEnsureIndex({ t: 1, reason: 1 });
		// 		this.tryEnsureIndex({ creatorId:1, roomId: 1, userId: 1, reason:1 }, { unique: 1 });
		this.tryEnsureIndex({ creatorId:1, roomId: 1, reason:1 }, { unique: 1, partialFilterExpression: { roomId: { $type: 'string' } } });
		this.tryEnsureIndex({ creatorId:1, userId: 1, reason:1 }, { unique: 1, partialFilterExpression: { userId: { $type: 'string' } } });
	}

	isExistsWithRoomId(creatorId, roomId, reason) {
		const record = this.findOne({ creatorId, roomId, reason }, {});
		console.log('isExistsWithRoomId:record', record);
		return !!record;
	}

	isExistsWithUserId(creatorId, userId, reason) {
		const record = this.findOne({ creatorId, userId, reason }, {});
		console.log('isExistsWithUserId:record', record);
		return !!record;
	}

	createWithRoomId(roomId, reason, creatorId) {
		const data = { t: 'r', ts: new Date(), roomId, reason, creatorId };
		console.log('createWithRoomId:data', data);
		if (!this.isExistsWithRoomId(creatorId, roomId, reason)) {
			this.insert(data);
		}
	}

	createWithUserId(userId, reason, creatorId) {
		const data = { t: 'u', ts: new Date(), userId, reason, creatorId };
		console.log('createWithUserId:data', data);
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

	findByTypesAndFromDate(types, from, options) {
		const query = {
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
