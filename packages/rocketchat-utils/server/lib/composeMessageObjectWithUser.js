import { Users } from 'meteor/rocketchat:models';
// import { settings } from 'meteor/rocketchat:settings';

const getUser = (userId) => Users.findOneByIdWithCustomFields(userId);

export const composeMessageObjectWithUser = function(message, userId) {
	if (message) {
		if (message.starred && Array.isArray(message.starred)) {
			message.starred = message.starred.filter((star) => star._id === userId);
		}
		if (message.u && message.u._id) {
			const user = getUser(message.u._id);
			message.u = user;
		}
		// if (message.mentions && message.mentions.length && settings.get('UI_Use_Real_Name')) {
		// 	message.mentions.forEach((mention) => {
		// 		const user = getUser(mention._id);
		// 		mention.name = user && user.name;
		// 	});
		// }
	}
	return message;
};
