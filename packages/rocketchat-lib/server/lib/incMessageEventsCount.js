import { callbacks } from 'meteor/rocketchat:callbacks';
import { Rooms } from 'meteor/rocketchat:models';
import { Logger } from 'meteor/rocketchat:logger';
const logger = new Logger('incMessageEventsCount', {});

callbacks.add('afterSaveMessage', async(msg, room, user) => {
	logger.debug('afterSaveMessage', msg, room, user);

	const rid = (msg && msg.rid) || (room && room._id);

	if (!rid) {
		logger.warn('afterSaveMessage without rid');
	} else {
		try {
			await Rooms.incMessageEventsCountById(rid);
		} catch (err) {
			logger.error(err);
		}
	}

	return msg;
});

callbacks.add('afterDeleteMessage', async(msg) => {
	logger.debug('afterDeleteMessage', msg);

	const rid = (msg && msg.rid);

	if (!rid) {
		logger.warn('afterDeleteMessage without rid');
	} else {
		try {
			await Rooms.incMessageEventsCountById(rid);
		} catch (err) {
			logger.error(err);
		}
	}

	return msg;
});
