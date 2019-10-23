export const getDefaultSubscriptionPref = (userPref) => {
	const subscription = {};

	const {
		desktopNotifications,
		mobileNotifications,
		emailNotificationMode,
		highlights,
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
		subscription.isImageFilesAllowed = true;
	}

	if (typeof isAudioFilesAllowed !== 'undefined') {
		subscription.isAudioFilesAllowed = isAudioFilesAllowed;
	} else {
		subscription.isAudioFilesAllowed = true;
	}

	if (typeof isVideoFilesAllowed !== 'undefined') {
		subscription.isVideoFilesAllowed = isVideoFilesAllowed;
	} else {
		subscription.isVideoFilesAllowed = true;
	}

	if (typeof isOtherFilesAllowed !== 'undefined') {
		subscription.isOtherFilesAllowed = isOtherFilesAllowed;
	} else {
		subscription.isOtherFilesAllowed = true;
	}

	return subscription;
};
