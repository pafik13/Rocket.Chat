import { settings } from 'meteor/rocketchat:settings';
import { roomTypes } from 'meteor/rocketchat:utils';

export const getDefaultSubscriptionPref = (user, roomType) => {
	const getDefaultValue = (key) => settings.get(`Accounts_Default_User_Preferences_${ key }`);

	const subscription = {};

	const preferences = (user.settings && user.settings.preferences) || {};
	const {
		emailNotificationMode,
		highlights,
		uploadsState,
		isImageFilesAllowed,
		isAudioFilesAllowed,
		isVideoFilesAllowed,
		isOtherFilesAllowed,
		isLinksAllowed,
	} = preferences;

	if (Array.isArray(highlights) && highlights.length) {
		subscription.userHighlights = highlights;
	}

	const roomTypeName = roomTypes.getRoomTypeName(roomType);

	const desktopNotifications = preferences[`desktopNotifications${ roomTypeName }`];
	if (desktopNotifications && desktopNotifications !== 'default') {
		subscription.desktopNotifications = desktopNotifications;
		subscription.desktopPrefOrigin = 'user';
	}

	const mobileNotifications = preferences[`mobileNotifications${ roomTypeName }`];
	if (mobileNotifications && mobileNotifications !== 'default') {
		subscription.mobilePushNotifications = mobileNotifications;
		subscription.mobilePrefOrigin = 'user';
	}

	if (emailNotificationMode && emailNotificationMode !== 'default') {
		subscription.emailNotifications = emailNotificationMode;
		subscription.emailPrefOrigin = 'user';
	}

	if (roomType === 'd') {
		if (typeof isImageFilesAllowed !== 'undefined') {
			subscription.isImageFilesAllowed = isImageFilesAllowed;
		} else {
			subscription.isImageFilesAllowed = getDefaultValue('isImageFilesAllowed');
		}

		if (typeof isAudioFilesAllowed !== 'undefined') {
			subscription.isAudioFilesAllowed = isAudioFilesAllowed;
		} else {
			subscription.isAudioFilesAllowed = getDefaultValue('isAudioFilesAllowed');
		}

		if (typeof isVideoFilesAllowed !== 'undefined') {
			subscription.isVideoFilesAllowed = isVideoFilesAllowed;
		} else {
			subscription.isVideoFilesAllowed = getDefaultValue('isVideoFilesAllowed');
		}

		if (typeof isOtherFilesAllowed !== 'undefined') {
			subscription.isOtherFilesAllowed = isOtherFilesAllowed;
		} else {
			subscription.isOtherFilesAllowed = getDefaultValue('isOtherFilesAllowed');
		}

		if (typeof uploadsState !== 'undefined') {
			subscription.uploadsState = uploadsState;
		} else {
			subscription.uploadsState = getDefaultValue('uploadsState');
		}

		if (typeof isLinksAllowed !== 'undefined') {
			subscription.isLinksAllowed = isLinksAllowed;
		} else {
			subscription.isLinksAllowed = getDefaultValue('isLinksAllowed');
		}
	}

	return subscription;
};
