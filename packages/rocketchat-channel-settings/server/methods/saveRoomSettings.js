import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { hasPermission } from 'meteor/rocketchat:authorization';
import { Rooms } from 'meteor/rocketchat:models';
import { validateGeoJSON } from 'meteor/rocketchat:utils';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { _ } from 'meteor/underscore';
import { isValid as isValidCountryCode } from 'i18n-iso-countries';


import { saveRoomName } from '../functions/saveRoomName';
import { saveRoomTopic } from '../functions/saveRoomTopic';
import { saveRoomAnnouncement } from '../functions/saveRoomAnnouncement';
import { saveRoomCustomFields } from '../functions/saveRoomCustomFields';
import { saveRoomDescription } from '../functions/saveRoomDescription';
import { saveRoomType } from '../functions/saveRoomType';
import { saveRoomReadOnly } from '../functions/saveRoomReadOnly';
import { saveReactWhenReadOnly } from '../functions/saveReactWhenReadOnly';
import { saveRoomSystemMessages } from '../functions/saveRoomSystemMessages';
import { saveRoomTokenpass } from '../functions/saveRoomTokens';
import { saveStreamingOptions } from '../functions/saveStreamingOptions';

const fields = [
	'roomName',
	'roomTopic',
	'roomAnnouncement',
	'roomCustomFields',
	'roomDescription',
	'roomType',
	'readOnly',
	'reactWhenReadOnly',
	'systemMessages',
	'default',
	'joinCode',
	'tokenpass',
	'streamingOptions',
	'retentionEnabled',
	'retentionMaxAge',
	'retentionExcludePinned',
	'retentionFilesOnly',
	'retentionOverrideGlobal',
	'encrypted',
	'membersHidden',
	'location',
	'filesHidden',
	'blocked',
	'country',
	'canMembersAddUser',
	'linkVisible',
];
Meteor.methods({
	saveRoomSettings(rid, settings, value) {
		const userId = Meteor.userId();

		if (!userId) {
			throw new Meteor.Error('error-invalid-user', 'Invalid user', {
				function: 'RocketChat.saveRoomName',
			});
		}
		if (!Match.test(rid, String)) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', {
				method: 'saveRoomSettings',
			});
		}

		if (typeof settings !== 'object') {
			settings = {
				[settings] : value,
			};
		}

		if (!Object.keys(settings).every((key) => fields.includes(key))) {
			throw new Meteor.Error('error-invalid-settings', 'Invalid settings provided', {
				method: 'saveRoomSettings',
			});
		}

		if (!hasPermission(userId, 'edit-room', rid)) {
			throw new Meteor.Error('error-action-not-allowed', 'Editing room is not allowed', {
				method: 'saveRoomSettings',
				action: 'Editing_room',
			});
		}

		const room = Rooms.findOneById(rid);

		if (!room) {
			throw new Meteor.Error('error-invalid-room', 'Invalid room', {
				method: 'saveRoomSettings',
			});
		}

		if (room.broadcast && (settings.readOnly || settings.reactWhenReadOnly)) {
			throw new Meteor.Error('error-action-not-allowed', 'Editing readOnly/reactWhenReadOnly are not allowed for broadcast rooms', {
				method: 'saveRoomSettings',
				action: 'Editing_room',
			});
		}

		if (room.blocked) {
			throw new Meteor.Error('error-action-not-allowed', 'Editing room are not allowed due to block', {
				method: 'saveRoomSettings',
				action: 'Editing_room',
			});
		}

		const user = Meteor.user();

		// validations

		Object.keys(settings).forEach((setting) => {
			const value = settings[setting];
			if (settings === 'default' && !hasPermission(userId, 'view-room-administration')) {
				throw new Meteor.Error('error-action-not-allowed', 'Viewing room administration is not allowed', {
					method: 'saveRoomSettings',
					action: 'Viewing_room_administration',
				});
			}
			if (setting === 'roomType' && value !== room.t && value === 'c' && !hasPermission(userId, 'create-c')) {
				throw new Meteor.Error('error-action-not-allowed', 'Changing a private group to a public channel is not allowed', {
					method: 'saveRoomSettings',
					action: 'Change_Room_Type',
				});
			}
			if (setting === 'roomType' && value !== room.t && value === 'p' && !hasPermission(userId, 'create-p')) {
				throw new Meteor.Error('error-action-not-allowed', 'Changing a public channel to a private room is not allowed', {
					method: 'saveRoomSettings',
					action: 'Change_Room_Type',
				});
			}
			if (setting === 'encrypted' && value !== room.encrypted && (room.t !== 'd' && room.t !== 'p')) {
				throw new Meteor.Error('error-action-not-allowed', 'Only groups or direct channels can enable encryption', {
					method: 'saveRoomSettings',
					action: 'Change_Room_Encrypted',
				});
			}

			if (setting === 'retentionEnabled' && !hasPermission(userId, 'edit-room-retention-policy', rid) && value !== room.retention.enabled) {
				throw new Meteor.Error('error-action-not-allowed', 'Editing room retention policy is not allowed', {
					method: 'saveRoomSettings',
					action: 'Editing_room',
				});
			}
			if (setting === 'retentionMaxAge' && !hasPermission(userId, 'edit-room-retention-policy', rid) && value !== room.retention.maxAge) {
				throw new Meteor.Error('error-action-not-allowed', 'Editing room retention policy is not allowed', {
					method: 'saveRoomSettings',
					action: 'Editing_room',
				});
			}
			if (setting === 'retentionExcludePinned' && !hasPermission(userId, 'edit-room-retention-policy', rid) && value !== room.retention.excludePinned) {
				throw new Meteor.Error('error-action-not-allowed', 'Editing room retention policy is not allowed', {
					method: 'saveRoomSettings',
					action: 'Editing_room',
				});
			}
			if (setting === 'retentionFilesOnly' && !hasPermission(userId, 'edit-room-retention-policy', rid) && value !== room.retention.filesOnly) {
				throw new Meteor.Error('error-action-not-allowed', 'Editing room retention policy is not allowed', {
					method: 'saveRoomSettings',
					action: 'Editing_room',
				});
			}
			if (setting === 'retentionOverrideGlobal') {
				delete settings.retentionMaxAge;
				delete settings.retentionExcludePinned;
				delete settings.retentionFilesOnly;
			}
			if (setting === 'membersHidden' && !hasPermission(userId, 'edit-room', rid)) {
				throw new Meteor.Error('error-action-not-allowed', 'Editing room members visibility is not allowed', {
					method: 'saveRoomSettings',
					action: 'Editing_room',
				});
			}
			if (setting === 'location') {
				if (!hasPermission(userId, 'edit-room', rid)) {
					throw new Meteor.Error('error-action-not-allowed', 'Editing location is not allowed', {
						method: 'saveRoomSettings',
						action: 'Editing_room',
					});
				}
				const locationErrors = validateGeoJSON(value);
				if (locationErrors) {
					throw new Meteor.Error('error-invalid-location', locationErrors, {
						method: 'saveRoomSettings',
						action: 'Editing_room',
					});
				}
			}
			if (setting === 'filesHidden' && !hasPermission(userId, 'edit-room', rid)) {
				throw new Meteor.Error('error-action-not-allowed', 'Editing room files visibility is not allowed', {
					method: 'saveRoomSettings',
					action: 'Editing_room',
				});
			}
			if (setting === 'blocked' && !hasPermission(userId, 'edit-room', rid)) {
				throw new Meteor.Error('error-action-not-allowed', 'Editing room blocked state is not allowed', {
					method: 'saveRoomSettings',
					action: 'Editing_room',
				});
			}
			if (setting === 'country') {
				if (!hasPermission(userId, 'edit-room', rid)) {
					throw new Meteor.Error('error-action-not-allowed', 'Editing room blocked state is not allowed', {
						method: 'saveRoomSettings',
						action: 'Editing_room',
					});
				}
				if (!isValidCountryCode(value)) {
					throw new Meteor.Error('error-invalid-country', 'Invalid country code', {
						method: 'saveRoomSettings',
						action: 'Editing_room',
					});
				}
			}

			if (setting === 'canMembersAddUser' && !hasPermission(userId, 'edit-room', rid)) {
				throw new Meteor.Error('error-action-not-allowed', 'Editing room canMembersAddUser is not allowed', {
					method: 'saveRoomSettings',
					action: 'Editing_room',
				});
			}

			if (setting === 'linkVisible' && (room.t === 'p' || !hasPermission(userId, 'edit-room', rid))) {
				throw new Meteor.Error('error-action-not-allowed', 'Editing room link visibility is not allowed', {
					method: 'saveRoomSettings',
					action: 'Editing_room',
				});
			}
		});

		Object.keys(settings).forEach((setting) => {
			const value = settings[setting];
			switch (setting) {
				case 'roomName':
					saveRoomName(rid, value, user);
					break;
				case 'roomTopic':
					if (value !== room.topic) {
						saveRoomTopic(rid, value, user);
					}
					break;
				case 'roomAnnouncement':
					if (value !== room.announcement) {
						saveRoomAnnouncement(rid, value, user);
					}
					break;
				case 'roomCustomFields':
					if (!_.isEqual(value, room.customFields)) {
						const newCustomFields = {
							...room.customFields,
							...value,
						};
						saveRoomCustomFields(rid, newCustomFields);
					}
					break;
				case 'roomDescription':
					if (value !== room.description) {
						saveRoomDescription(rid, value, user);
					}
					break;
				case 'roomType':
					if (value !== room.t) {
						saveRoomType(rid, value, user);
					}
					break;
				case 'tokenpass':
					check(value, {
						require: String,
						tokens: [{
							token: String,
							balance: String,
						}],
					});
					saveRoomTokenpass(rid, value);
					break;
				case 'streamingOptions':
					saveStreamingOptions(rid, value);
					break;
				case 'readOnly':
					if (value !== room.ro) {
						saveRoomReadOnly(rid, value, user);
					}
					break;
				case 'reactWhenReadOnly':
					if (value !== room.reactWhenReadOnly) {
						saveReactWhenReadOnly(rid, value, user);
					}
					break;
				case 'systemMessages':
					if (value !== room.sysMes) {
						saveRoomSystemMessages(rid, value, user);
					}
					break;
				case 'joinCode':
					Rooms.setJoinCodeById(rid, String(value));
					break;
				case 'default':
					Rooms.saveDefaultById(rid, value);
					break;
				case 'retentionEnabled':
					Rooms.saveRetentionEnabledById(rid, value);
					break;
				case 'retentionMaxAge':
					Rooms.saveRetentionMaxAgeById(rid, value);
					break;
				case 'retentionExcludePinned':
					Rooms.saveRetentionExcludePinnedById(rid, value);
					break;
				case 'retentionFilesOnly':
					Rooms.saveRetentionFilesOnlyById(rid, value);
					break;
				case 'retentionOverrideGlobal':
					Rooms.saveRetentionOverrideGlobalById(rid, value);
					break;
				case 'encrypted':
					Rooms.saveEncryptedById(rid, value);
					break;
				case 'membersHidden':
					Rooms.setMembersHiddenById(rid, value);
					break;
				case 'filesHidden':
					Rooms.setFilesHiddenById(rid, value);
					break;
				case 'location':
					Rooms.setLocationById(rid, value);
					break;
				case 'blocked':
					Rooms.setBlockedById(rid, value);
					break;
				case 'country':
					Rooms.setCountryById(rid, value);
					break;
				case 'canMembersAddUser':
					Rooms.setCanMembersAddUserById(rid, value);
					break;
				case 'linkVisible':
					Rooms.setLinkVisibleById(rid, value);
					break;
			}
		});

		Meteor.defer(function() {
			const room = Rooms.findOneById(rid);
			callbacks.run('afterSaveRoomSettings', room);
		});

		return {
			result: true,
			rid: room._id,
		};
	},
});
