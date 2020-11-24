
/* eslint-env mongo */
/* eslint no-var: 0 */
/* global sleep */
var restoreMessages = function(rid) {
	var bulkInsert = db.rocketchat_message.initializeUnorderedBulkOp();
	var bulkRemove = db.rocketchat__trash.initializeUnorderedBulkOp();
	db.rocketchat__trash.find({ rid, __collection__: 'message' }).sort({ ts: -1 }).limit(5000).forEach(
		function(doc) {
			delete doc.__collection__;
			delete doc._deletedAt;
			// printjson(doc)
			bulkInsert.insert(doc);
			bulkRemove.find({ _id:doc._id }).removeOne();
		}
	);
	bulkInsert.execute();
	bulkRemove.execute();
};
var restoreRoom = function(rid) {
	var bulkInsert = db.rocketchat_room.initializeUnorderedBulkOp();
	var bulkRemove = db.rocketchat__trash.initializeUnorderedBulkOp();
	var deletedAt;
	db.rocketchat__trash.find({ _id: rid, __collection__: 'room' }).forEach(
		function(doc) {
			deletedAt = doc._deletedAt;
			delete doc.__collection__;
			delete doc._deletedAt;
			// printjson(doc)
			bulkInsert.insert(doc);
			bulkRemove.find({ _id:doc._id }).removeOne();
		}
	);
	bulkInsert.execute();
	bulkRemove.execute();
	return deletedAt;
};
var restoreSubs = function(rid, deletedAt) {
	var bulkInsert = db.rocketchat_subscription.initializeUnorderedBulkOp();
	var bulkRemove = db.rocketchat__trash.initializeUnorderedBulkOp();
	var d = new Date();
	d.setDate(d.getDate() - 7);
	var date = deletedAt || d;
	print(date);
	db.rocketchat__trash.find({ rid, __collection__: 'subscription', _deletedAt: { $gte: date } }).forEach(
		function(doc) {
			delete doc.__collection__;
			delete doc._deletedAt;
			// printjson(doc)
			bulkInsert.insert(doc);
			bulkRemove.find({ _id:doc._id }).removeOne();
		}
	);
	bulkInsert.execute();
	bulkRemove.execute();
};
// eslint-disable-next-line no-unused-vars
var restore = function(rid) {
	restoreMessages(rid);
	print('Messages is restored');
	sleep(1000);
	var deletedAt = restoreRoom(rid);
	print('Room is restored');
	deletedAt.setHours(0, 0, 0, 0);
	print(deletedAt);
	sleep(100);
	restoreSubs(rid, deletedAt);
	print('Subs is restored');
	var usersCount = db.rocketchat_subscription.find({ rid }).count();
	print('usersCount', usersCount);
	db.rocketchat_room.updateOne({ _id: rid }, { $set: { usersCount } });
	var room = db.rocketchat_room.findOne({ _id: rid });
	printjson(room);
};
