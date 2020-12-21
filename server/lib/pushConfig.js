import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { sendPushNotifications } from 'meteor/rocketchat:lib';
import { hasRole } from 'meteor/rocketchat:authorization';
import { settings } from 'meteor/rocketchat:settings';


Meteor.methods({
	push_test() {
		const user = Meteor.user();

		if (!user) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', {
				method: 'push_test',
			});
		}

		if (!hasRole(user._id, 'admin')) {
			throw new Meteor.Error('error-not-allowed', 'Not allowed', {
				method: 'push_test',
			});
		}

		if (settings.get('Push_enable') !== true) {
			throw new Meteor.Error('error-push-disabled', 'Push is disabled', {
				method: 'push_test',
			});
		}

		if (user.tokens && user.tokens.length === 0) {
			throw new Meteor.Error('error-no-tokens-for-this-user', 'There are no tokens for this user', {
				method: 'push_test',
			});
		}

		sendPushNotifications({
			from: 'push',
			title: `@${ user.username }`,
			text: TAPi18n.__('This_is_a_push_test_messsage'),
			apn: {
				text: `@${ user.username }:\n${ TAPi18n.__('This_is_a_push_test_messsage') }`,
			},
			sound: 'default',
			userId: user._id,
			event: 'message',
		});

		return {
			message: 'Your_push_was_sent_to_s_devices',
			params: [user.tokens.length],
		};
	},
});
