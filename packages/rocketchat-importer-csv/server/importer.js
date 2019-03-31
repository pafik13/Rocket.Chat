import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import {
	Base,
	ProgressStep,
	Selection,
	SelectionChannel,
	SelectionUser,
} from 'meteor/rocketchat:importer';
import { RocketChatFile } from 'meteor/rocketchat:file';
import { Users, Rooms } from 'meteor/rocketchat:models';
import {
	validateCustomFields,
	saveCustomFieldsWithoutValidation,
	sendMessage,
	saveCustomFields,
	setName,
	setActiveStatus
} from 'meteor/rocketchat:lib';

export class CsvImporter extends Base {
	constructor(info) {
		super(info);

		this.csvParser = require('csv-parse/lib/sync');
		this.csvParserOpts = { max_limit_on_data_read: 1e6 };
		this.messages = new Map();
	}

	prepare(dataURI, sentContentType, fileName) {
		super.prepare(dataURI, sentContentType, fileName);

		const uriResult = RocketChatFile.dataURIParse(dataURI);
		const zip = new this.AdmZip(new Buffer(uriResult.image, 'base64'));
		const zipEntries = zip.getEntries();

		let tempChannels = [];
		let tempUsers = [];
		const tempMessages = new Map();
		let tempAvatars = [];
		let tempNames = [];
		let tempStatuses = [];
		for (const entry of zipEntries) {
			this.logger.debug(`Entry: ${ entry.entryName }`);

			// Ignore anything that has `__MACOSX` in it's name, as sadly these things seem to mess everything up
			if (entry.entryName.indexOf('__MACOSX') > -1) {
				this.logger.debug(`Ignoring the file: ${ entry.entryName }`);
				continue;
			}

			// Directories are ignored, since they are "virtual" in a zip file
			if (entry.isDirectory) {
				this.logger.debug(`Ignoring the directory entry: ${ entry.entryName }`);
				continue;
			}

			// Parse the channels
			if (entry.entryName.toLowerCase() === 'channels.csv') {
				super.updateProgress(ProgressStep.PREPARING_CHANNELS);
				const parsedChannels = this.csvParser(entry.getData().toString(), this.csvParserOpts);
				tempChannels = parsedChannels.map((c) => ({
					id: c[0].trim(),
					name: c[1].trim(),
					creator: c[2].trim(),
					isPrivate: c[3].trim().toLowerCase() !== 'public',
					type: c[3].trim().toLowerCase(),
					members: c[4].trim().split(';').map((m) => m.trim()),
				}));
				continue;
			}

			// Parse the users
			if (entry.entryName.toLowerCase() === 'users.csv') {
				super.updateProgress(ProgressStep.PREPARING_USERS);
				const parsedUsers = this.csvParser(entry.getData().toString());
				tempUsers = parsedUsers.map((u) => ({
					id: u[0].trim(),
					username: u[1].trim(),
					email: u[2].trim(),
					name: u[3].trim(),
					customFields: {
						anonym_id: u[4].trim(),
						registeredAt: u[5].trim(),
						photoUrl: u[6].trim(),
					},
				}));
				continue;
			}

			// Parse the messages
			if (entry.entryName.indexOf('/') > -1) {
				const item = entry.entryName.split('/'); // random/messages.csv
				const channelName = item[0]; // random
				const msgGroupData = item[1].split('.')[0]; // 2015-10-04

				if (!tempMessages.get(channelName)) {
					tempMessages.set(channelName, new Map());
				}

				let msgs = [];

				try {
					msgs = this.csvParser(entry.getData().toString());
				} catch (e) {
					this.logger.warn(`The file ${ entry.entryName } contains invalid syntax`, e);
					continue;
				}

				tempMessages.get(channelName).set(msgGroupData, msgs.map((m) => ({ username: m[0], ts: m[1], text: m[2] })));
				continue;
			}

			// Parse the avatars
			if (entry.entryName.toLowerCase() === 'avatars.csv') {
				super.updateProgress(ProgressStep.PREPARING_AVATARS);
				const parsedAvatars = this.csvParser(entry.getData().toString(), this.csvParserOpts);
				tempAvatars = parsedAvatars.map((a) => ({
					id: a[0].trim(),
					username: a[1].trim(),
					avatarUrl: a[2].trim(),
				}));
				continue;
			}

			// Parse the names
			if (entry.entryName.toLowerCase() === 'names.csv') {
				super.updateProgress(ProgressStep.PREPARING_NAMES);
				const parsedNames = this.csvParser(entry.getData().toString(), this.csvParserOpts);
				tempNames = parsedNames.map((a) => ({
					id: a[0].trim(),
					rocketId: a[1].trim(),
					name: a[2].trim(),
				}));
				continue;
			}
			
			// Parse the statuses
			if (entry.entryName.toLowerCase() === 'statuses.csv') {
				super.updateProgress(ProgressStep.PREPARING_STATUSES);
				const parsedStatuses = this.csvParser(entry.getData().toString(), this.csvParserOpts);
				tempStatuses = parsedStatuses.map((a) => ({
					id: a[0].trim(),
					rocketId: a[1].trim(),
					status: a[2].trim() === 'true',
				}));
				continue;
			}
		}

		// Insert the users record, eventually this might have to be split into several ones as well
		// if someone tries to import a several thousands users instance
		const usersId = this.collection.insert({ import: this.importRecord._id, importer: this.name, type: 'users', users: tempUsers });
		this.users = this.collection.findOne(usersId);
		super.updateRecord({ 'count.users': tempUsers.length });
		super.addCountToTotal(tempUsers.length);

		// Insert the channels records.
		const channelsId = this.collection.insert({ import: this.importRecord._id, importer: this.name, type: 'channels', channels: tempChannels });
		this.channels = this.collection.findOne(channelsId);
		super.updateRecord({ 'count.channels': tempChannels.length });
		super.addCountToTotal(tempChannels.length);

		// Save the messages records to the import record for `startImport` usage
		super.updateProgress(ProgressStep.PREPARING_MESSAGES);
		let messagesCount = 0;
		for (const [channel, messagesMap] of tempMessages.entries()) {
			if (!this.messages.get(channel)) {
				this.messages.set(channel, new Map());
			}

			for (const [msgGroupData, msgs] of messagesMap.entries()) {
				messagesCount += msgs.length;
				super.updateRecord({ messagesstatus: `${ channel }/${ msgGroupData }` });

				if (Base.getBSONSize(msgs) > Base.getMaxBSONSize()) {
					Base.getBSONSafeArraysFromAnArray(msgs).forEach((splitMsg, i) => {
						const messagesId = this.collection.insert({ import: this.importRecord._id, importer: this.name, type: 'messages', name: `${ channel }/${ msgGroupData }.${ i }`, messages: splitMsg });
						this.messages.get(channel).set(`${ msgGroupData }.${ i }`, this.collection.findOne(messagesId));
					});
				} else {
					const messagesId = this.collection.insert({ import: this.importRecord._id, importer: this.name, type: 'messages', name: `${ channel }/${ msgGroupData }`, messages: msgs });
					this.messages.get(channel).set(msgGroupData, this.collection.findOne(messagesId));
				}
			}
		}

		super.updateRecord({ 'count.messages': messagesCount, messagesstatus: null });
		super.addCountToTotal(messagesCount);

		// Insert the avatars records.
		const avatarsId = this.collection.insert({ import: this.importRecord._id, importer: this.name, type: 'avatars', avatars: tempAvatars });
		this.avatars = this.collection.findOne(avatarsId);
		super.updateRecord({ 'count.avatars': tempAvatars.length });
		super.addCountToTotal(tempAvatars.length);

		// Insert the names records.
		const namesId = this.collection.insert({ import: this.importRecord._id, importer: this.name, type: 'names', names: tempNames });
		this.names = this.collection.findOne(namesId);
		super.updateRecord({ 'count.names': tempNames.length });
		super.addCountToTotal(tempNames.length);

		// Insert the statuses records.
		const statusesId = this.collection.insert({ import: this.importRecord._id, importer: this.name, type: 'statuses', statuses: tempStatuses });
		this.statuses = this.collection.findOne(statusesId);
		super.updateRecord({ 'count.statuses': tempStatuses.length });
		super.addCountToTotal(tempStatuses.length);

		// Ensure we have at least a single user, channel, or message
		if (tempUsers.length === 0 && tempChannels.length === 0 && messagesCount === 0 && tempAvatars.length === 0 && tempNames.length === 0 && tempStatuses.length === 0) {
			this.logger.error('No users, channels, or messages found in the import file.');
			super.updateProgress(ProgressStep.ERROR);
			return super.getProgress();
		}

		const selectionUsers = tempUsers.map((u) => new SelectionUser(u.id, u.username, u.email, false, false, true));
		const selectionChannels = tempChannels.map((c) => new SelectionChannel(c.id, c.name, false, true, c.isPrivate));
		const selectionMessages = this.importRecord.count.messages;
		const selectionAvatars = this.importRecord.count.avatars;
		const selectionNames = this.importRecord.count.names;
		const selectionStatuses = this.importRecord.count.statuses;

		super.updateProgress(ProgressStep.USER_SELECTION);
		return new Selection(this.name, selectionUsers, selectionChannels, selectionMessages, selectionAvatars, selectionNames, selectionStatuses);
	}

	startImport(importSelection) {
		super.startImport(importSelection);
		const started = Date.now();

		// Ensure we're only going to import the users that the user has selected
		for (const user of importSelection.users) {
			for (const u of this.users.users) {
				if (u.id === user.user_id) {
					u.do_import = user.do_import;
				}
			}
		}
		this.collection.update({ _id: this.users._id }, { $set: { users: this.users.users } });

		// Ensure we're only importing the channels the user has selected.
		for (const channel of importSelection.channels) {
			for (const c of this.channels.channels) {
				if (c.id === channel.channel_id) {
					c.do_import = channel.do_import;
				}
			}
		}
		this.collection.update({ _id: this.channels._id }, { $set: { channels: this.channels.channels } });

		const startedByUserId = Meteor.userId();
		Meteor.defer(() => {
			super.updateProgress(ProgressStep.IMPORTING_USERS);

			try {
				// Import the users
				for (const u of this.users.users) {
					if (!u.do_import) {
						continue;
					}

					Meteor.runAsUser(startedByUserId, () => {
						let existantUser = Users.findOneByEmailAddress(u.email);

						// If we couldn't find one by their email address, try to find an existing user by their username
						if (!existantUser) {
							existantUser = Users.findOneByUsername(u.username);
						}

						if (existantUser) {
							// since we have an existing user, let's try a few things
							u.rocketId = existantUser._id;
							Users.update({ _id: u.rocketId }, { $addToSet: { importIds: u.id } });
						} else {
							const userId = Accounts.createUser({ email: u.email, password: `p${ u.customFields.id }` });
							Meteor.runAsUser(userId, () => {
								Meteor.call('setUsername', u.username, { joinDefaultChannelsSilenced: true });
								Users.setName(userId, u.name);
								Users.update({ _id: userId }, { $addToSet: { importIds: u.id } });
								validateCustomFields(u.customFields);
								saveCustomFieldsWithoutValidation(userId, u.customFields);
								u.rocketId = userId;
							});
						}

						super.addCountCompleted(1);
					});
				}
				this.collection.update({ _id: this.users._id }, { $set: { users: this.users.users } });

				// Import the channels
				super.updateProgress(ProgressStep.IMPORTING_CHANNELS);
				for (const c of this.channels.channels) {
					if (!c.do_import) {
						continue;
					}

					Meteor.runAsUser(startedByUserId, () => {
						const existantRoom = Rooms.findOneByName(c.name);
						// If the room exists or the name of it is 'general', then we don't need to create it again
						if (existantRoom || c.name.toUpperCase() === 'GENERAL') {
							c.rocketId = c.name.toUpperCase() === 'GENERAL' ? 'GENERAL' : existantRoom._id;
							Rooms.update({ _id: c.rocketId }, { $addToSet: { importIds: c.id } });
						} else {
							// Find the rocketchatId of the user who created this channel
							let creatorId = null;
							for (const u of this.users.users) {
								if (u.username === c.creator && u.do_import) {
									creatorId = u.rocketId;
								}
							}
							if (!creatorId) {
								creatorId = Users.findOneByUsername(c.creator)._id;
							}

							if (!creatorId) {
								this.logger.error(`CHANNELS: Not found user=${ c.creator }`);
								return;
							}

							if (c.type === 'direct') {
								// Create the direct
								this.logger.info(`DIRECT: ${ JSON.stringify(c) }`);
								Meteor.runAsUser(creatorId, () => {
									const roomInfo = Meteor.call('createDirectMessage', c.members[0]);
									c.rocketId = roomInfo.rid;
								});
							} else {
								// Create the channel
								Meteor.runAsUser(creatorId, () => {
									const roomInfo = Meteor.call(c.isPrivate ? 'createPrivateGroup' : 'createChannel', c.name, c.members, false, c.customFields);
									c.rocketId = roomInfo.rid;
								});
							}

							Rooms.update({ _id: c.rocketId }, { $addToSet: { importIds: c.id } });
						}

						super.addCountCompleted(1);
					});
				}
				this.collection.update({ _id: this.channels._id }, { $set: { channels: this.channels.channels } });

				// If no channels file, collect channel map from DB for message-only import
				if (this.channels.channels.length === 0) {
					for (const cname of this.messages.keys()) {
						Meteor.runAsUser(startedByUserId, () => {
							const existantRoom = Rooms.findOneByName(cname);
							if (existantRoom || cname.toUpperCase() === 'GENERAL') {
								this.channels.channels.push({
									id: cname.replace('.', '_'),
									name: cname,
									rocketId: (cname.toUpperCase() === 'GENERAL' ? 'GENERAL' : existantRoom._id),
									do_import: true,
								});
							}
						});
					}
				}

				// If no users file, collect user map from DB for message-only import
				if (this.users.users.length === 0) {
					for (const [ch, messagesMap] of this.messages.entries()) {
						const isDialog = ch === 'dialog';
						this.logger.info(`'Messages prepare:' ch,isDialog: ${ ch }, ${ isDialog }`);
						if (!isDialog) {
							const csvChannel = this.getChannelFromName(ch);
							if (!csvChannel || !csvChannel.do_import) {
								continue;
							}
						}
						Meteor.runAsUser(startedByUserId, () => {
							for (const msgs of messagesMap.values()) {
								for (const msg of msgs.messages) {
									if (!this.getUserFromUsername(msg.username)) {
										const user = Users.findOneByUsername(msg.username);
										if (user) {
											this.users.users.push({
												rocketId: user._id,
												username: user.username,
											});
											this.logger.info(`'Messages prepare:' user: ${ JSON.stringify(user) }`);
										}
									}
								}
							}
						});
					}
				}

				// Import the Messages
				super.updateProgress(ProgressStep.IMPORTING_MESSAGES);
				for (const [ch, messagesMap] of this.messages.entries()) {
					let csvChannel;
					const isDialog = ch === 'dialog';
					if (!isDialog) {
						csvChannel = this.getChannelFromName(ch);
						if (!csvChannel || !csvChannel.do_import) {
							continue;
						}
					}

					Meteor.runAsUser(startedByUserId, () => {
						const timestamps = {};
						for (const [msgGroupData, msgs] of messagesMap.entries()) {
							const room = Rooms.findOneById(isDialog ? msgGroupData : csvChannel.rocketId, { fields: { usernames: 1, t: 1, name: 1 } });

							super.updateRecord({ messagesstatus: `${ ch }/${ msgGroupData }.${ msgs.messages.length }` });
							for (const msg of msgs.messages) {
								if (isNaN(new Date(parseInt(msg.ts, 10)))) {
									this.logger.warn(`Timestamp on a message in ${ ch }/${ msgGroupData } is invalid`);
									super.addCountCompleted(1);
									continue;
								}

								const creator = this.getUserFromUsername(msg.username);
								this.logger.info(`'sendMessage' creator: ${ JSON.stringify(creator) }`);
								if (creator) {
									let suffix = '';
									if (timestamps[msg.ts] === undefined) {
										timestamps[msg.ts] = 1;
									} else {
										suffix = `-${ timestamps[msg.ts] }`;
										timestamps[msg.ts] += 1;
									}
									const msgObj = {
										_id: `csv-${ isDialog ? msgGroupData : csvChannel.id }-${ msg.ts }${ suffix }`,
										ts: new Date(parseInt(msg.ts, 10)),
										msg: msg.text,
										rid: room._id,
										u: {
											_id: creator._id,
											username: creator.username,
										},
									};

									const res = sendMessage(creator, msgObj, room, true);
									this.logger.info(`'sendMessage' result: ${ JSON.stringify(res) }`);
								}

								super.addCountCompleted(1);
							}
						}
					});
				}


				// If no users file, collect user map from DB for message-only import
				// const usersCache = new Map();
				// for (const a of this.avatars.avatars) {
				// 	this.logger.info(`'Avatars prepare:' username: ${ a.username }`);
				// 	Meteor.runAsUser(startedByUserId, () => {
				// 		if (!usersCache.get(a.username)) {
				// 			const user = Users.findOneByUsername(a.username);
				// 			if (user) {
				// 				usersCache.set(user.username, user);
				// 				this.logger.info(`'Avatars prepare:' user: ${ JSON.stringify(user) }`);
				// 			}
				// 		}
				// 	});
				// }
				// this.logger.info(`'Avatars prepare:' usersCache size: ${ usersCache.length }`);


				// Import the avatars
				super.updateProgress(ProgressStep.IMPORTING_AVATARS);
				for (const a of this.avatars.avatars) {
					Meteor.runAsUser(startedByUserId, () => {
						// const user = usersCache.get(a.username);

						const user = Users.findOneByUsername(a.username, { fields: { customFields: 1 } });
						// this.logger.error(user);
						user.customFields.photoUrl = a.avatarUrl;
						saveCustomFields(user._id, user.customFields);

						super.addCountCompleted(1);
					});
				}

				// Import the names
				super.updateProgress(ProgressStep.IMPORTING_NAMES);
				for (const n of this.names.names) {
					Meteor.runAsUser(startedByUserId, () => {

						setName(n.rocketId, n.name);

						super.addCountCompleted(1);
					});
				}

				// Import the statuses
				super.updateProgress(ProgressStep.IMPORTING_STATUSES);
				for (const s of this.statuses.statuses) {
					Meteor.runAsUser(startedByUserId, () => {

						setActiveStatus(s.rocketId, s.status);

						super.addCountCompleted(1);
					});
				}

				super.updateProgress(ProgressStep.FINISHING);
				super.updateProgress(ProgressStep.DONE);
			} catch (e) {
				this.logger.error(e);
				super.updateProgress(ProgressStep.ERROR);
			}

			const timeTook = Date.now() - started;
			this.logger.log(`CSV Import took ${ timeTook } milliseconds.`);
		});

		return super.getProgress();
	}

	getSelection() {
		const selectionUsers = this.users.users.map((u) => new SelectionUser(u.id, u.username, u.email, false, false, true));
		const selectionChannels = this.channels.channels.map((c) => new SelectionChannel(c.id, c.name, false, true, c.isPrivate));
		const selectionMessages = this.importRecord.count.messages;
		const selectionAvatars = this.importRecord.count.avatars;
		const selectionNames = this.importRecord.count.names;
		const selectionStatuses = this.importRecord.count.statuses;

		return new Selection(this.name, selectionUsers, selectionChannels, selectionMessages, selectionAvatars, selectionNames, selectionStatuses);
	}

	getChannelFromName(channelName) {
		for (const ch of this.channels.channels) {
			if (ch.name === channelName) {
				return ch;
			}
		}
	}

	getUserFromUsername(username) {
		for (const u of this.users.users) {
			if (u.username === username) {
				return Users.findOneById(u.rocketId, { fields: { username: 1 } });
			}
		}
	}
}
