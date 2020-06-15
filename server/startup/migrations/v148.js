import { Migrations } from 'meteor/rocketchat:migrations';
import { Settings, Users } from 'meteor/rocketchat:models';

Migrations.add({
	version: 148,
	async up() {
		Settings.remove({ _id: 'Accounts_Default_User_Preferences_desktopNotifications' });
		Settings.remove({ _id: 'Accounts_Default_User_Preferences_mobileNotifications' });

		Users.find({
			$or: [
				{ 'settings.preferences.desktopNotifications': { $exists: true } },
				{ 'settings.preferences.mobileNotifications': { $exists: true } },
			],
		}).forEach((user) => {
			const { desktopNotifications, mobileNotifications } = user.settings.preferences;
			if (desktopNotifications) {
				Users.update({ _id: user._id }, {
					$set: {
						'settings.preferences.desktopNotificationsChannels': desktopNotifications,
						'settings.preferences.desktopNotificationsGroups': desktopNotifications,
						'settings.preferences.desktopNotificationsDirects': desktopNotifications,
					}, $unset: {
						'settings.preferences.desktopNotifications': 1,
					},
				});
			}

			if (mobileNotifications) {
				Users.update({ _id: user._id }, {
					$set: {
						'settings.preferences.mobileNotificationsChannels': mobileNotifications,
						'settings.preferences.mobileNotificationsGroups': mobileNotifications,
						'settings.preferences.mobileNotificationsDirects': mobileNotifications,
					}, $unset: {
						'settings.preferences.mobileNotifications': 1,
					},
				});
			}
		});
	},
});
