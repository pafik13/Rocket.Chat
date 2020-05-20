import { Users } from 'meteor/rocketchat:models';
// import { settings } from 'meteor/rocketchat:settings';

const getUser = (userId) => Users.findOneByIdWithCustomFields(userId);

export const composeMessageObjectWithUser = function(message, userId) {
	if (message) {
		if (message.starred && Array.isArray(message.starred)) {
			message.starred = message.starred.filter((star) => star._id === userId);
		}
		let user;
		if (message.u && message.u._id) {
			user = getUser(message.u._id);
			if (user) {
				message.u = user;
			} else if (!message.u.customFields) {
				message.u.customFields = {
					anonym_id: -1, registeredAt: '', photoUrl: '',
				};
			}
		}

		if (message.t) {
			if (user && message.msg === user.username) {
				message.msg = user.name;
			} else {
				const hero = Users.findOneByUsername(message.msg, { name: 1 });
				if (hero && hero.name) {
					message.msg = hero.name;
				}
			}
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
