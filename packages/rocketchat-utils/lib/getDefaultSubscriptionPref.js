import { settings } from 'meteor/rocketchat:settings';

export const getDefaultSubscriptionPref = (userPref) => {
	const getDefaultValue = (key) => settings.get(`Accounts_Default_User_Preferences_${ key }`);

	const subscription = {};

	const {
		desktopNotifications,
		mobileNotifications,
		emailNotificationMode,
		highlights,
		uploadsState,
		isImageFilesAllowed,
		isAudioFilesAllowed,
		isVideoFilesAllowed,
		isOtherFilesAllowed,
	} = (userPref.settings && userPref.settings.preferences) || {};

	if (Array.isArray(highlights) && highlights.length) {
		subscription.userHighlights = highlights;
	}

	if (desktopNotifications && desktopNotifications !== 'default') {
		subscription.desktopNotifications = desktopNotifications;
		subscription.desktopPrefOrigin = 'user';
	}

	if (mobileNotifications && mobileNotifications !== 'default') {
		subscription.mobilePushNotifications = mobileNotifications;
		subscription.mobilePrefOrigin = 'user';
	}

	if (emailNotificationMode && emailNotificationMode !== 'default') {
		subscription.emailNotifications = emailNotificationMode;
		subscription.emailPrefOrigin = 'user';
	}

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

	return subscription;
};
