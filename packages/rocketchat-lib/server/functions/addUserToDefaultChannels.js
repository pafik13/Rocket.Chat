import { Rooms } from 'meteor/rocketchat:models';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { addUserToRoom } from './addUserToRoom';

export const addUserToDefaultChannels = function(user, silenced) {
	callbacks.run('beforeJoinDefaultChannels', user);
	const defaultRooms = Rooms.findByDefaultAndTypes(true, ['c', 'p'], { fields: { usernames: 0 } }).fetch();
	defaultRooms.forEach((room) => {
		addUserToRoom(room, user, null, silenced);
	});
};
