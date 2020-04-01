import { Meteor } from 'meteor/meteor';
import { Users, Rooms, Subscriptions, Messages } from 'meteor/rocketchat:models';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { hasPermission, addUserRoles } from 'meteor/rocketchat:authorization';
import { getValidRoomName, validateGeoJSON, spotlightRoomsIsValidText } from 'meteor/rocketchat:utils';
import _ from 'underscore';
import s from 'underscore.string';


function createDirectRoom(source, target, extraData, options) {
	const rid = [source._id, target._id].sort().join('');

	Rooms.upsert({ _id: rid }, {
		$setOnInsert: Object.assign({
			t: 'd',
			usernames: [source.username, target.username],
			msgs: 0,
			ts: new Date(),
		}, extraData),
	});

	Subscriptions.upsert({ rid, 'u._id': target._id }, {
		$setOnInsert: Object.assign({
			name: source.username,
			t: 'd',
			open: true,
			alert: true,
			unread: 0,
			customFields: source.customFields,
			i: {
				_id: source._id,
				username: source.username,
			},
			u: {
				_id: target._id,
				username: target.username,
			},
		}, options.subscriptionExtra),
	});

	Subscriptions.upsert({ rid, 'u._id': source._id }, {
		$setOnInsert: Object.assign({
			name: target.username,
			t: 'd',
			open: true,
			alert: true,
			unread: 0,
			customFields: target.customFields,
			i: {
				_id: target._id,
				username: target.username,
			},
			u: {
				_id: source._id,
				username: source.username,
			},
		}, options.subscriptionExtra),
	});

	return {
		_id: rid,
		t: 'd',
	};
}

export const createRoom = function(type, name, owner, members, readOnly, extraData = {}, options = {}) {
	if (type === 'd') {
		return createDirectRoom(members[0], members[1], extraData, options);
	}

	name = s.trim(name);
	owner = s.trim(owner);
	members = [].concat(members);

	if (!name) {
		throw new Meteor.Error('error-invalid-name', 'Invalid name', { function: 'RocketChat.createRoom' });
	}

	owner = Users.findOneByUsername(owner, { fields: { username: 1 } });
	if (!owner) {
		throw new Meteor.Error('error-invalid-user', 'Invalid user', { function: 'RocketChat.createRoom' });
	}

	if (!_.contains(members, owner.username)) {
		members.push(owner.username);
	}

	if (extraData.broadcast) {
		readOnly = true;
		delete extraData.reactWhenReadOnly;
	}

	if (extraData.location) {
		const locationErrors = validateGeoJSON(extraData.location);
		if (locationErrors) {
			throw new Meteor.Error('error-invalid-location', locationErrors, { function: 'RocketChat.createRoom' });
		}
	}

	const now = new Date();

	const validRoomNameOptions = {};

	if (options.nameValidationRegex) {
		validRoomNameOptions.nameValidationRegex = options.nameValidationRegex;
	}

	let room = Object.assign({
		name: getValidRoomName(name, null, validRoomNameOptions),
		fname: name,
		t: type,
		msgs: 0,
		usersCount: 0,
		u: {
			_id: owner._id,
			username: owner.username,
		},
		default: false,
	}, extraData, {
		ts: now,
		ro: readOnly === true,
		sysMes: readOnly !== true,
		isImageFilesAllowed: true,
		isAudioFilesAllowed: true,
		isVideoFilesAllowed: true,
		isOtherFilesAllowed: true,
	});

	const blacklisted = !spotlightRoomsIsValidText(name);
	if (blacklisted) {
		room.blacklisted = blacklisted;
	}

	if (type === 'c') {
		callbacks.run('beforeCreateChannel', owner, room);
	}

	room = Rooms.createWithFullRoomData(room);

	const subs = [];
	for (const username of members) {
		const member = Users.findOneByUsername(username, { fields: { username: 1, 'settings.preferences': 1 } });
		const isTheOwner = username === owner.username;
		if (!member) {
			continue;
		}

		// make all room members (Except the owner) muted by default, unless they have the post-readonly permission
		if (readOnly === true && !hasPermission(member._id, 'post-readonly') && !isTheOwner) {
			Rooms.muteUsernameByRoomId(room._id, username);
		}

		const extra = options.subscriptionExtra || {};

		extra.open = true;

		if (username === owner.username) {
			extra.ls = now;
		}

		const subId = Subscriptions.createWithRoomAndUser(room, member, extra);
		subs.push({
			user: member,
			subscription: { _id: subId },
		});
	}

	addUserRoles(owner._id, ['owner'], room._id);

	if (type === 'c') {
		Messages.createChannelCreatedByRoomIdAndUser(room._id, owner);
		Meteor.defer(() => {
			callbacks.run('afterCreateChannel', owner, room);
		});
	} else if (type === 'p') {
		Messages.createGroupCreatedByRoomIdAndUser(room._id, owner);
		Meteor.defer(() => {
			callbacks.run('afterCreatePrivateGroup', owner, room);
		});
	}
	Meteor.defer(() => {
		callbacks.run('afterCreateRoom', { owner, room }, subs);
	});

	return {
		rid: room._id,
		name: room.name,
	};
};
