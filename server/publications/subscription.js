import { Meteor } from 'meteor/meteor';
import { Subscriptions, Users, Rooms } from 'meteor/rocketchat:models';
import { Notifications } from 'meteor/rocketchat:notifications';
import { SystemLogger } from 'meteor/rocketchat:logger';
import { composeMessageObjectWithUser } from 'meteor/rocketchat:utils';

const fields = {
	t: 1,
	ts: 1,
	ls: 1,
	name: 1,
	fname: 1,
	customFields: 1,
	rid: 1,
	code: 1,
	f: 1,
	u: 1,
	i: 1,
	open: 1,
	alert: 1,
	roles: 1,
	unread: 1,
	userMentions: 1,
	groupMentions: 1,
	archived: 1,
	audioNotifications: 1,
	audioNotificationValue: 1,
	desktopNotifications: 1,
	desktopNotificationDuration: 1,
	mobilePushNotifications: 1,
	emailNotifications: 1,
	unreadAlert: 1,
	unaccepted: 1,
	_updatedAt: 1,
	blocked: 1,
	blocker: 1,
	autoTranslate: 1,
	autoTranslateLanguage: 1,
	disableNotifications: 1,
	hideUnreadStatus: 1,
	muteGroupMentions: 1,
	ignored: 1,
	E2EKey: 1,
};

Meteor.methods({
	'subscriptions/get'(updatedAt) {
		const userId = Meteor.userId();
		if (!userId) {
			return [];
		}

		this.unblock();

		const options = { fields };

		const records = Subscriptions.findByUserId(userId, options).fetch();

		const user = Users.findOneByIdWithCustomFields(userId);

		records.forEach(function(record) {
			record.u = user;

			try {
				const roomOptions = { fields: { lastMessage: 1 } };
				const { lastMessage } = Rooms.findOneById(record.rid, roomOptions);

				if (lastMessage && lastMessage.u) {
					record.lastMessage = composeMessageObjectWithUser(lastMessage, lastMessage.u._id);
				} else {
					record.lastMessage = null;
				}
			} catch (e) {
				SystemLogger.error(`subscriptions/get::rid=${ record.rid }`, e);
				record.lastMessage = null;
			}
		});

		if (updatedAt instanceof Date) {
			return {
				update: records.filter(function(record) {
					return record._updatedAt > updatedAt;
				}),
				remove: Subscriptions.trashFindDeletedAfter(updatedAt, {
					'u._id': Meteor.userId(),
				}, {
					fields: {
						_id: 1,
						_deletedAt: 1,
					},
				}).fetch(),
			};
		}

		return records;
	},
});

Subscriptions.on('change', ({ clientAction, id, data }) => {
	switch (clientAction) {
		case 'inserted':
		case 'updated':
			// Override data cuz we do not publish all fields
			data = Subscriptions.findOneById(id, { fields });
			break;

		case 'removed':
			data = Subscriptions.trashFindOneById(id, { fields: { u: 1, rid: 1 } });
			break;
	}

	Notifications.streamUser.__emit(data.u._id, clientAction, data);

	Notifications.notifyUserInThisInstance(data.u._id, 'subscriptions-changed', clientAction, data);
});
