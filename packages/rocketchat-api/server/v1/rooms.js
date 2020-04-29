import { Meteor } from 'meteor/meteor';
import { Match, check } from 'meteor/check';
import { Random } from 'meteor/random';
import { FileUpload } from 'meteor/rocketchat:file-upload';
import { Rooms, Subscriptions } from 'meteor/rocketchat:models';
import Busboy from 'busboy';
import { API } from '../api';
import S3 from 'aws-sdk/clients/s3';
import Path from 'path';
import _ from 'underscore';
import { settings } from 'meteor/rocketchat:settings';
import { stringToBoolean } from 'meteor/rocketchat:utils';


function findRoomByIdOrName({ params, checkedArchived = true }) {
	if ((!params.roomId || !params.roomId.trim()) && (!params.roomName || !params.roomName.trim())) {
		throw new Meteor.Error('error-roomid-param-not-provided', 'The parameter "roomId" or "roomName" is required');
	}

	const fields = { ...API.v1.defaultFieldsToExclude };

	let room;
	if (params.roomId) {
		room = Rooms.findOneById(params.roomId, { fields });
	} else if (params.roomName) {
		room = Rooms.findOneByName(params.roomName, { fields });
	}
	if (!room) {
		throw new Meteor.Error('error-room-not-found', 'The required "roomId" or "roomName" param provided does not match any room');
	}
	if (checkedArchived && room.archived) {
		throw new Meteor.Error('error-room-archived', `The room, ${ room.name }, is archived`);
	}

	return room;
}

API.v1.addRoute('rooms.complain', { authRequired: true }, {
	post() {
		const room = findRoomByIdOrName({ params: this.bodyParams });

		Meteor.runAsUser(this.userId, () => Meteor.call('complainAboutRoom', room._id, this.bodyParams.reason));

		return API.v1.success();
	},
});

API.v1.addRoute('rooms.get', { authRequired: true }, {
	get() {
		const { updatedSince } = this.queryParams;

		let updatedSinceDate;
		if (updatedSince) {
			if (isNaN(Date.parse(updatedSince))) {
				throw new Meteor.Error('error-updatedSince-param-invalid', 'The "updatedSince" query parameter must be a valid date.');
			} else {
				updatedSinceDate = new Date(updatedSince);
			}
		}

		let result;
		Meteor.runAsUser(this.userId, () => result = Meteor.call('rooms/get', updatedSinceDate));

		if (Array.isArray(result)) {
			result = {
				update: result,
				remove: [],
			};
		}

		return API.v1.success({
			update: result.update.map((room) => this.composeRoomWithLastMessage(room, this.userId)),
			remove: result.remove.map((room) => this.composeRoomWithLastMessage(room, this.userId)),
		});
	},
});

API.v1.addRoute('rooms.getMessageOffsetFromLast', { authRequired: true }, {
	get() {
		const { msgId } = this.queryParams;

		if (!msgId) {
			throw new Meteor.Error('error-query-param-invalid', 'The "msgId" query parameter is empty.');
		}

		let offset;
		Meteor.runAsUser(this.userId, () => offset = Meteor.call('getMessageOffsetFromLast', msgId));

		return API.v1.success({
			offset,
		});
	},
});

API.v1.addRoute('rooms.upload/:rid', { authRequired: true }, {
	post() {
		const room = Meteor.call('canAccessRoom', this.urlParams.rid, this.userId);

		if (!room) {
			return API.v1.unauthorized();
		}

		const busboy = new Busboy({ headers: this.request.headers });
		const files = [];
		const fields = {};

		Meteor.wrapAsync((callback) => {
			busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
				if (fieldname !== 'file') {
					return files.push(new Meteor.Error('invalid-field'));
				}

				const fileDate = [];
				file.on('data', (data) => fileDate.push(data));

				file.on('end', () => {
					files.push({ fieldname, file, filename, encoding, mimetype, fileBuffer: Buffer.concat(fileDate) });
				});
			});

			busboy.on('field', (fieldname, value) => fields[fieldname] = value);

			busboy.on('finish', Meteor.bindEnvironment(() => callback()));

			this.request.pipe(busboy);
		})();

		if (files.length === 0) {
			return API.v1.failure('File required');
		}

		if (files.length > 1) {
			return API.v1.failure('Just 1 file is allowed');
		}

		const file = files[0];

		const fileStore = FileUpload.getStore('Uploads');

		const details = {
			name: file.filename,
			size: file.fileBuffer.length,
			type: file.mimetype,
			rid: this.urlParams.rid,
			userId: this.userId,
			mesId: fields._id,
		};

		Meteor.runAsUser(this.userId, () => {
			const uploadedFile = Meteor.wrapAsync(fileStore.insert.bind(fileStore))(details, file.fileBuffer);

			uploadedFile.description = fields.description;

			delete fields.description;
			if (fields.isVoice) {
				fields.isVoice = stringToBoolean(fields.isVoice);
			}

			API.v1.success(Meteor.call('sendFileMessage', this.urlParams.rid, null, uploadedFile, fields));
		});

		return API.v1.success();
	},
});

API.v1.addRoute('rooms.update/:rid', { authRequired: true }, {
	post() {
		const { rid } = this.urlParams;

		const room = Meteor.call('canAccessRoom', rid, this.userId);

		check(this.bodyParams, Match.ObjectIncluding({
			name: Match.Maybe(String),
			description: Match.Maybe(String),
		}));

		const { name, description } = this.bodyParams;

		Meteor.runAsUser(this.userId, () => {
			if (name && room.name !== name && name.trim()) {
				Meteor.call('saveRoomSettings', rid, 'roomName', name);
			}
			if (description && description.trim()) {
				Meteor.call('saveRoomSettings', rid, 'roomDescription', description);
			}

			return API.v1.success();
		});

	},
});

API.v1.addRoute('rooms.uploadAvatar/:rid', { authRequired: true }, {
	post() {
		const { rid } = this.urlParams;

		const room = Meteor.call('canAccessRoom', rid, this.userId);

		if (!room) {
			return API.v1.unauthorized();
		}

		const busboy = new Busboy({ headers: this.request.headers });
		const files = [];
		const fields = {};

		Meteor.wrapAsync((callback) => {
			busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
				if (fieldname !== 'file') {
					return files.push(new Meteor.Error('invalid-field'));
				}

				const fileData = [];
				file.on('data', (data) => fileData.push(data));

				file.on('end', () => {
					files.push({ fieldname, file, filename, encoding, mimetype, fileBuffer: Buffer.concat(fileData) });
				});
			});

			busboy.on('field', (fieldname, value) => fields[fieldname] = value);

			busboy.on('finish', Meteor.bindEnvironment(() => callback()));

			this.request.pipe(busboy);
		})();

		if (files.length === 0) {
			return API.v1.failure('File required');
		}

		if (files.length > 1) {
			return API.v1.failure('Just 1 file is allowed');
		}

		const file = files[0];

		const options = {
			secretAccessKey: settings.get('FileUpload_S3_AWSSecretAccessKey'),
			accessKeyId: settings.get('FileUpload_S3_AWSAccessKeyId'),
			region: 'eu-central-1',
			sslEnabled: true,
		};

		const s3 = new S3(options);

		const { userId } = this;
		const { filename, mimetype } = file;
		const prefix = 'images/rocket_room_avatars';
		const key = `${ prefix }/${ rid }/${ Random.id() }${ Path.extname(filename) }`;
		const params = {
			Body: file.fileBuffer,
			Bucket: 'fotoanon',
			Key: key,
			Tagging: `rid=${ rid }&userId=${ userId }&filename=${ filename }&mimetype=${ mimetype }`,
			ACL: 'public-read',
		};

		const customFields = {
			photoUrl: `https://s3.${ options.region }.amazonaws.com/${ params.Bucket }/${ params.Key }`,
		};

		Meteor.runAsUser(this.userId, () => {
			const data = Meteor.wrapAsync(s3.putObject.bind(s3))(params);

			Meteor.call('saveRoomSettings', rid, 'roomCustomFields', customFields);

			if (fields.name && room.name !== fields.name && fields.name.trim()) {
				Meteor.call('saveRoomSettings', rid, 'roomName', fields.name);
			}
			if (fields.description && fields.description.trim()) {
				Meteor.call('saveRoomSettings', rid, 'roomDescription', fields.description);
			}

			return API.v1.success(data);
		});
	},
});

API.v1.addRoute('rooms.saveNotification', { authRequired: true }, {
	post() {
		const saveNotifications = (notifications, roomId) => {
			Object.keys(notifications).forEach((notificationKey) =>
				Meteor.runAsUser(this.userId, () =>
					Meteor.call('saveNotificationSettings', roomId, notificationKey, notifications[notificationKey])
				)
			);
		};
		const { roomId, notifications } = this.bodyParams;

		if (!roomId) {
			return API.v1.failure('The \'roomId\' param is required');
		}

		if (!notifications || Object.keys(notifications).length === 0) {
			return API.v1.failure('The \'notifications\' param is required');
		}

		saveNotifications(notifications, roomId);

		return API.v1.success();
	},
});

API.v1.addRoute('rooms.saveFilesPreferences', { authRequired: true }, {
	post() {
		const { roomId, preferences } = this.bodyParams;

		if (!roomId) {
			return API.v1.failure('The \'roomId\' param is required');
		}

		if (!preferences || Object.keys(preferences).length === 0) {
			return API.v1.failure('The \'preferences\' param is required');
		}

		Meteor.runAsUser(this.userId, () =>
			Meteor.call('saveUploadsSettings', roomId, preferences)
		);

		return API.v1.success();
	},
});

API.v1.addRoute('rooms.favorite', { authRequired: true }, {
	post() {
		const { favorite } = this.bodyParams;

		if (!this.bodyParams.hasOwnProperty('favorite')) {
			return API.v1.failure('The \'favorite\' param is required');
		}

		const room = findRoomByIdOrName({ params: this.bodyParams });

		Meteor.runAsUser(this.userId, () => Meteor.call('toggleFavorite', room._id, favorite));

		return API.v1.success();
	},
});

API.v1.addRoute('rooms.banUser', { authRequired: true }, {
	post() {
		const { username } = this.bodyParams;

		if (!this.bodyParams.hasOwnProperty('username')) {
			return API.v1.failure('The \'username\' param is required');
		}

		const room = findRoomByIdOrName({ params: this.bodyParams });

		Meteor.runAsUser(this.userId, () => Meteor.call('banUser', { rid: room._id, username }));

		return API.v1.success();
	},
});

API.v1.addRoute('rooms.unbanUser', { authRequired: true }, {
	post() {
		const { username } = this.bodyParams;

		if (!this.bodyParams.hasOwnProperty('username')) {
			return API.v1.failure('The \'username\' param is required');
		}

		const room = findRoomByIdOrName({ params: this.bodyParams });

		Meteor.runAsUser(this.userId, () => Meteor.call('unbanUser', { rid: room._id, username }));

		return API.v1.success();
	},
});

API.v1.addRoute('rooms.getUsersByRole', { authRequired: true }, {
	post() {
		const { role } = this.bodyParams;

		if (!this.bodyParams.hasOwnProperty('role')) {
			return API.v1.failure('The \'role\' param is required');
		}

		const room = findRoomByIdOrName({ params: this.bodyParams });

		const data = Meteor.runAsUser(this.userId, () => Meteor.call('getUsersOfRoomByRole', room._id, role));

		return API.v1.success({ data });
	},
});

API.v1.addRoute('rooms.getBannedUsers', { authRequired: true }, {
	post() {
		const room = findRoomByIdOrName({ params: this.bodyParams });

		const data = Meteor.runAsUser(this.userId, () => Meteor.call('getBannedUsers', room._id));

		return API.v1.success({ data });
	},
});

API.v1.addRoute('rooms.cleanHistory', { authRequired: true }, {
	post() {
		const findResult = findRoomByIdOrName({ params: this.bodyParams });

		if (!this.bodyParams.latest) {
			return API.v1.failure('Body parameter "latest" is required.');
		}

		if (!this.bodyParams.oldest) {
			return API.v1.failure('Body parameter "oldest" is required.');
		}

		const latest = new Date(this.bodyParams.latest);
		const oldest = new Date(this.bodyParams.oldest);

		const inclusive = this.bodyParams.inclusive || false;

		Meteor.runAsUser(this.userId, () => Meteor.call('cleanRoomHistory', {
			roomId: findResult._id,
			latest,
			oldest,
			inclusive,
			limit: this.bodyParams.limit,
			excludePinned: this.bodyParams.excludePinned,
			filesOnly: this.bodyParams.filesOnly,
			fromUsers: this.bodyParams.users,
		}));

		return API.v1.success();
	},
});

API.v1.addRoute('rooms.info', { authRequired: true }, {
	get() {
		const filesPrefsFields = {
			uploadsState: 1,
			isImageFilesAllowed: 1,
			isAudioFilesAllowed: 1,
			isVideoFilesAllowed: 1,
			isOtherFilesAllowed: 1,
		};
		const room = findRoomByIdOrName({ params: this.requestParams() });
		const { fields } = this.parseJsonQuery();
		if (!Meteor.call('canAccessRoom', room._id, this.userId, {})) {
			return API.v1.failure('not-allowed', 'Not Allowed');
		}
		if (!_.isMatch(API.v1.defaultFieldsToExclude, fields)) {
			const result = Rooms.findOneByIdOrName(room._id, { fields });
			return API.v1.success({ room: result });
		}

		const options = {
			fields: {
				...fields,
				blocker: 1,
				blocked: 1,
				mobilePushNotifications: 1,
				...filesPrefsFields,
			},
		};
		const subscription = Subscriptions.findOneByRoomIdAndUserId(room._id, this.userId, options);
		if (subscription) {
			delete subscription._id;
		}

		const result = Rooms.findOneByIdOrName(room._id, {
			...fields,
			...filesPrefsFields,
		});

		return API.v1.success({ room: {
			...result,
			...subscription,
		} });
	},
});

API.v1.addRoute('rooms.leave', { authRequired: true }, {
	post() {
		const room = findRoomByIdOrName({ params: this.bodyParams });
		Meteor.runAsUser(this.userId, () => {
			Meteor.call('leaveRoom', room._id);
		});

		return API.v1.success();
	},
});

API.v1.addRoute('rooms.delete', { authRequired: true }, {
	post() {
		const room = findRoomByIdOrName({ params: this.bodyParams });

		Meteor.runAsUser(this.userId, () => {
			Meteor.call('eraseRoom', room._id);
		});

		return API.v1.success();
	},
});

API.v1.addRoute('rooms.deleteFileMessage', { authRequired: true }, {
	post() {
		const { fileId } = this.bodyParams;

		if (!this.bodyParams.hasOwnProperty('fileId')) {
			return API.v1.failure('The \'fileId\' param is required');
		}
		Meteor.runAsUser(this.userId, () => {
			Meteor.call('deleteFileMessage', fileId);
		});

		return API.v1.success();
	},
});
