import { settings } from 'meteor/rocketchat:settings';
import { Users } from 'meteor/rocketchat:models';
import { roomTypes } from 'meteor/rocketchat:utils';

export const getUserNotificationPreference = (user, pref, roomType) => {
	if (typeof user === 'string') {
		user = Users.findOneById(user);
	}

	let preferenceKey;
	const roomTypeName = roomTypes.getRoomTypeName(roomType);
	switch (pref) {
		case 'desktop': preferenceKey = `desktopNotifications${ roomTypeName }`; break;
		case 'mobile': preferenceKey = `mobileNotifications${ roomTypeName }`; break;
		case 'email': preferenceKey = 'emailNotificationMode'; break;
	}

	if (user && user.settings && user.settings.preferences && user.settings.preferences[preferenceKey] !== 'default') {
		return {
			value: user.settings.preferences[preferenceKey],
			origin: 'user',
		};
	}
	const serverValue = settings.get(`Accounts_Default_User_Preferences_${ preferenceKey }`);
	if (serverValue) {
		return {
			value: serverValue,
			origin: 'server',
		};
	}

	return null;
};
