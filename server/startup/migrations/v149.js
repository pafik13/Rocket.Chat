import { Migrations } from 'meteor/rocketchat:migrations';
import { Rooms } from 'meteor/rocketchat:models';

Migrations.add({
	version: 149,
	up() {
		const query = {
			t: { $ne: 'd' },
		};

		const rooms = Rooms.find(query).fetch();

		for (let i = 0; i < rooms.length; i++) {
			const room = rooms[i];
			Rooms.update({ _id: room._id }, { $set: { messageEventsCount: room.msgs } });
		}
	},
});
