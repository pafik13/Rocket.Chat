import { expect } from 'chai';

import {
	getCredentials,
	api,
	request,
	credentials,
	apiPublicChannelName,
	apiPrivateChannelName,
	apiUsername,
	apiEmail,
} from '../../data/api-data.js';
import { password } from '../../data/user.js';

function getChannelInfo(roomName) {
	return new Promise((resolve/* , reject*/) => {
		request.get(api('channels.info'))
			.set(credentials)
			.query({
				roomName,
			})
			.end((err, req) => {
				resolve(req.body.channel);
			});
	});
}

function getGroupInfo(roomName) {
	return new Promise((resolve/* , reject*/) => {
		request.get(api('groups.info'))
			.set(credentials)
			.query({
				roomName,
			})
			.end((err, req) => {
				resolve(req.body.group);
			});
	});
}


describe('[Admin]', function() {
	this.retries(0);

	before((done) => getCredentials(done));

	describe('ping', () => {
		let user;
		before((done) => {
			const username = `user.test.${ Date.now() }`;
			const email = `${ username }@rocket.chat`;
			request.post(api('users.create'))
				.set(credentials)
				.send({ email, name: username, username, password })
				.end((err, res) => {
					user = res.body.user;
					done();
				});
		});

		let userCredentials;
		before((done) => {
			request.post(api('login'))
				.send({
					user: user.username,
					password,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					userCredentials = {};
					userCredentials['X-Auth-Token'] = res.body.data.authToken;
					userCredentials['X-User-Id'] = res.body.data.userId;
				})
				.end(done);
		});
		after((done) => {
			request.post(api('users.delete')).set(credentials).send({
				userId: user._id,
			}).end(done);
			user = undefined;
		});

		it('should not return OK', (done) => {
			request.get(api('admin.ping'))
				.set(userCredentials)
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('error', 'You must be a admin! [error-access-denied]');
					expect(res.body).to.have.property('errorType', 'error-access-denied');
				})
				.end(done);
		});

		it('should return OK', (done) => {
			request.get(api('admin.ping'))
				.set(credentials)
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
	});

	describe('createDirectMessage/isDirectMessageExists', () => {
		const username1 = `first_${ apiUsername }`;
		const email1 = `first_${ apiEmail }`;
		const username2 = `second_${ apiUsername }`;
		const email2 = `second_${ apiEmail }`;
		let userId1;
		let userId2;

		before((done) => {
			request.post(api('users.create'))
				.set(credentials)
				.send({
					email: email1,
					name: username1,
					username: username1,
					password,
					active: true,
					roles: ['user'],
					joinDefaultChannels: true,
					verified: true,
				})
				.expect(200)
				.expect((res) => {
					userId1 = res.body.user._id;
				})
				.end(done);
		});

		before((done) => {
			request.post(api('users.create'))
				.set(credentials)
				.send({
					email: email2,
					name: username2,
					username: username2,
					password,
					active: true,
					roles: ['user'],
					joinDefaultChannels: true,
					verified: true,
				})
				.expect((res) => {
					userId2 = res.body.user._id;
				})
				.end(done);
		});

		it('should create for usernames', (done) => {
			request.post(api('admin.createDirectMessage'))
				.set(credentials)
				.send({
					usernames: [username1, 'rocket.cat'],
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.end(done);
		});

		it('should create for userIds', (done) => {
			request.post(api('admin.createDirectMessage'))
				.set(credentials)
				.send({
					userIds: [userId1, userId2],
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.end(done);
		});

		it('should exist for usernames', (done) => {
			request.post(api('admin.isDirectMessageExists'))
				.set(credentials)
				.send({
					usernames: [username1, 'rocket.cat'],
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.end(done);
		});

		it('should exist for userIds', (done) => {
			request.post(api('admin.isDirectMessageExists'))
				.set(credentials)
				.send({
					userIds: [userId1, userId2],
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.end(done);
		});

		it('should not exist for usernames', (done) => {
			request.post(api('admin.isDirectMessageExists'))
				.set(credentials)
				.send({
					usernames: [username1, 'rocket.cat1'],
				})
				.expect('Content-Type', 'application/json')
				.expect(404)
				.end(done);
		});

		it('should not exist for userIds', (done) => {
			request.post(api('admin.isDirectMessageExists'))
				.set(credentials)
				.send({
					userIds: [userId1, 'userId2'],
				})
				.expect('Content-Type', 'application/json')
				.expect(404)
				.end(done);
		});
	});

	describe('getRoomInfo', () => {
		it('should return channel basic structure - admin.getRoomInfo', async() => {
			const testChannel = await getChannelInfo(apiPublicChannelName);

			return request.get(api('admin.getRoomInfo'))
				.set(credentials)
				.query({
					roomId: testChannel._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('room._id');
					expect(res.body).to.have.nested.property('room.name', apiPublicChannelName);
					expect(res.body).to.have.nested.property('room.t', 'c');
				});
		});
		it('should return group basic structure - admin.getRoomInfo', async() => {
			const testGroup = await getGroupInfo(apiPrivateChannelName);

			return request.get(api('admin.getRoomInfo'))
				.set(credentials)
				.query({
					roomId: testGroup._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('room._id');
					expect(res.body).to.have.nested.property('room.name', apiPrivateChannelName);
					expect(res.body).to.have.nested.property('room.t', 'p');
				});
		});
	});

	describe('setCustomFieldsForRoom - channel', () => {
		let testChannel;
		it('/channels.invite', async() => {
			testChannel = await getChannelInfo(apiPublicChannelName);

			return request.post(api('channels.invite'))
				.set(credentials)
				.send({
					roomId: testChannel._id,
					userId: 'rocket.cat',
				})
				.expect('Content-Type', 'application/json')
				.expect(200);
		});

		it('/channels.addModerator', (done) => {
			request.post(api('channels.addModerator'))
				.set(credentials)
				.send({
					roomId: testChannel._id,
					userId: 'rocket.cat',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.end(done);
		});

		it('should set customFields.anonym_id to channel', (done) => {
			request.post(api('admin.setCustomFieldsForRoom'))
				.set(credentials)
				.send({
					roomId: testChannel._id,
					userId: 'rocket.cat',
					customFields: { anonym_id: 'xxx' },
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('room._id');
					expect(res.body).to.have.nested.property('room.name', apiPublicChannelName);
					expect(res.body).to.have.nested.property('room.t', 'c');
				})
				.end(done);
		});
	});

	describe('setCustomFieldsForRoom - group', () => {
		let testGroup;
		it('/groups.invite', async() => {
			testGroup = await getGroupInfo(apiPrivateChannelName);

			return request.post(api('groups.invite'))
				.set(credentials)
				.send({
					roomId: testGroup._id,
					userId: 'rocket.cat',
				})
				.expect('Content-Type', 'application/json')
				.expect(200);
		});
		it('/groups.addModerator', (done) => {
			request.post(api('groups.addModerator'))
				.set(credentials)
				.send({
					roomId: testGroup._id,
					userId: 'rocket.cat',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.end(done);
		});
		it('should set customFields.anonym_id to group', (done) => {
			request.post(api('admin.setCustomFieldsForRoom'))
				.set(credentials)
				.send({
					roomId: testGroup._id,
					userId: 'rocket.cat',
					customFields: { anonym_id: 'xxx' },
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('room._id');
					expect(res.body).to.have.nested.property('room.name', apiPrivateChannelName);
					expect(res.body).to.have.nested.property('room.t', 'p');
				})
				.end(done);
		});

	});

	describe('getRoomsByAnonymId', () => {
		it('should return channels and groups for anonym_id', (done) => {
			request.get(api('admin.getRoomsByAnonymId'))
				.set(credentials)
				.query({
					anonym_id: 'xxx',
					rocket_id: 'rocket.cat',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('rooms').and.to.be.an('array');
					const { rooms } = res.body;
					for (let i = 0; i < rooms.length; i++) {
						const room = rooms[i];
						expect(room).to.have.nested.property('roles').and.to.be.an('array');
					}
				})
				.end(done);
		});
		it('should return only channels for anonym_id', (done) => {
			request.get(api('admin.getRoomsByAnonymId'))
				.set(credentials)
				.query({
					anonym_id: 'xxx',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('rooms').and.to.be.an('array');
					const { rooms } = res.body;
					for (let i = 0; i < rooms.length; i++) {
						const room = rooms[i];
						expect(room).to.have.nested.property('t', 'c');
					}
				})
				.end(done);
		});
		it('should return error for empty anonym_id', (done) => {
			request.get(api('admin.getRoomsByAnonymId'))
				.set(credentials)
				.query({})
				.expect('Content-Type', 'application/json')
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('error', "The 'anonym_id' query param is required");
				})
				.end(done);
		});
		it('should return only channels: channels.getByAnonymId', (done) => {
			request.get(api('channels.getByAnonymId'))
				.query({
					anonym_id: 'xxx',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('channels').and.to.be.an('array');
					const { channels } = res.body;
					for (let i = 0; i < channels.length; i++) {
						const channel = channels[i];
						expect(channel).to.have.nested.property('t', 'c');
					}
				})
				.end(done);
		});
	});

	describe('createDirectMessage/isDirectMessageExists', () => {
		const username = `${ apiUsername }_${ Date.now() }`;
		const email = `${ Date.now() }_${ apiEmail }`;
		let userId;

		before((done) => {
			request.post(api('users.create'))
				.set(credentials)
				.send({
					email,
					name: username,
					username,
					password,
					active: true,
					roles: ['user'],
					joinDefaultChannels: true,
					verified: true,
				})
				.expect(200)
				.expect((res) => {
					userId = res.body.user._id;
				})
				.end(done);
		});

		it('should return error if not provided userId or username', (done) => {
			request.post(api('admin.setUserNotificationsPreference'))
				.set(credentials)
				.send({
					isChannelNotificationsEnabled: false,
				})
				.expect('Content-Type', 'application/json')
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
				})
				.end(done);
		});

		it('should disable notifications from channels', (done) => {
			request.post(api('admin.setUserNotificationsPreference'))
				.set(credentials)
				.send({
					username,
					isChannelNotificationsEnabled: false,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.nested.property('user.settings.preferences.desktopNotificationsChannels', 'nothing');
					expect(res.body).to.have.nested.property('user.settings.preferences.mobileNotificationsChannels', 'nothing');
				})
				.end(done);
		});

		it('should disable notifications from groups', (done) => {
			request.post(api('admin.setUserNotificationsPreference'))
				.set(credentials)
				.send({
					username,
					isGroupNotificationsEnabled: false,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.nested.property('user.settings.preferences.desktopNotificationsGroups', 'nothing');
					expect(res.body).to.have.nested.property('user.settings.preferences.mobileNotificationsGroups', 'nothing');
				})
				.end(done);
		});

		it('should disable notifications from directs', (done) => {
			request.post(api('admin.setUserNotificationsPreference'))
				.set(credentials)
				.send({
					username,
					isDirectNotificationsEnabled: false,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.nested.property('user.settings.preferences.desktopNotificationsDirects', 'nothing');
					expect(res.body).to.have.nested.property('user.settings.preferences.mobileNotificationsDirects', 'nothing');
				})
				.end(done);
		});

		it('should enable notifications from channels', (done) => {
			request.post(api('admin.setUserNotificationsPreference'))
				.set(credentials)
				.send({
					userId,
					isChannelNotificationsEnabled: true,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.nested.property('user.settings.preferences.desktopNotificationsChannels', 'default');
					expect(res.body).to.have.nested.property('user.settings.preferences.mobileNotificationsChannels', 'default');
				})
				.end(done);
		});

		it('should enable notifications from groups', (done) => {
			request.post(api('admin.setUserNotificationsPreference'))
				.set(credentials)
				.send({
					userId,
					isGroupNotificationsEnabled: true,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.nested.property('user.settings.preferences.desktopNotificationsGroups', 'default');
					expect(res.body).to.have.nested.property('user.settings.preferences.mobileNotificationsGroups', 'default');
				})
				.end(done);
		});

		it('should enable notifications from directs', (done) => {
			request.post(api('admin.setUserNotificationsPreference'))
				.set(credentials)
				.send({
					userId,
					isDirectNotificationsEnabled: true,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.nested.property('user.settings.preferences.desktopNotificationsDirects', 'default');
					expect(res.body).to.have.nested.property('user.settings.preferences.mobileNotificationsDirects', 'default');
				})
				.end(done);
		});
	});

	describe('block channel or group', () => {
		let testChannel; let testGroup;
		it('/admin.blockChannel', async() => {
			testChannel = await getChannelInfo(apiPublicChannelName);

			return request.post(api('admin.blockChannel'))
				.set(credentials)
				.send({
					channelId: testChannel._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200);
		});

		it('should throw an error when the channel is blocked', (done) => {
			request.post(api('chat.sendMessage'))
				.set(credentials)
				.send({
					message: {
						rid: testChannel._id,
						text: 'Sample message',
						alias: 'Gruggy',
						emoji: ':smirk:',
						avatar: 'http://res.guggy.com/logo_128.png',
					},
				})
				.expect('Content-Type', 'application/json')
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('errorType', 'error-room-blocked');
				})
				.end(done);
		});

		it('/admin.unblockChannel', async() => request.post(api('admin.unblockChannel'))
			.set(credentials)
			.send({
				channelId: testChannel._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200));

		it('should send message into channel', (done) => {
			request.post(api('chat.sendMessage'))
				.set(credentials)
				.send({
					message: {
						rid: testChannel._id,
						text: 'Sample message',
						alias: 'Gruggy',
						emoji: ':smirk:',
						avatar: 'http://res.guggy.com/logo_128.png',
					},
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.end(done);
		});


		it('/admin.blockGroup', async() => {
			testGroup = await getGroupInfo(apiPrivateChannelName);

			return request.post(api('admin.blockGroup'))
				.set(credentials)
				.send({
					groupId: testGroup._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200);
		});

		it('should throw an error when the group is blocked', (done) => {
			request.post(api('chat.sendMessage'))
				.set(credentials)
				.send({
					message: {
						rid: testGroup._id,
						text: 'Sample message',
						alias: 'Gruggy',
						emoji: ':smirk:',
						avatar: 'http://res.guggy.com/logo_128.png',
					},
				})
				.expect('Content-Type', 'application/json')
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('errorType', 'error-room-blocked');
				})
				.end(done);
		});

		it('/admin.unblockGroup', async() => request.post(api('admin.unblockGroup'))
			.set(credentials)
			.send({
				groupId: testGroup._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200));

		it('should send message into group', (done) => {
			request.post(api('chat.sendMessage'))
				.set(credentials)
				.send({
					message: {
						rid: testGroup._id,
						text: 'Sample message',
						alias: 'Gruggy',
						emoji: ':smirk:',
						avatar: 'http://res.guggy.com/logo_128.png',
					},
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.end(done);
		});
	});

	describe('disableUser/enableUser', () => {
		let user;
		before((done) => {
			const username = `user.test.${ Date.now() }`;
			const email = `${ username }@rocket.chat`;
			request.post(api('users.create'))
				.set(credentials)
				.send({ email, name: username, username, password })
				.end((err, res) => {
					user = res.body.user;
					done();
				});
		});

		let userCredentials;
		before((done) => {
			request.post(api('login'))
				.send({
					user: user.username,
					password,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					userCredentials = {};
					userCredentials['X-Auth-Token'] = res.body.data.authToken;
					userCredentials['X-User-Id'] = res.body.data.userId;
				})
				.end(done);
		});
		after((done) => {
			request.post(api('users.delete')).set(credentials).send({
				userId: user._id,
			}).end(done);
			user = undefined;
		});

		it('should get subscritions', (done) => {
			request.get(api('subscriptions.get'))
				.set(userCredentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.end(done);
		});

		it('should disable user', (done) => {
			request.post(api('admin.disableUser'))
				.set(credentials)
				.send({
					userId: user._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.end(done);
		});

		it('should not get subscritions', (done) => {
			request.get(api('subscriptions.get'))
				.set(userCredentials)
				.expect('Content-Type', 'application/json')
				.expect(403)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('errorType', 'error-user-disabled');
				})
				.end(done);
		});

		it('should logout', (done) => {
			request.post(api('logout'))
				.set(userCredentials)
				.send({})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.end(done);
		});

		it('should login', (done) => {
			request.post(api('login'))
				.send({
					user: user.username,
					password,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					userCredentials = {};
					userCredentials['X-Auth-Token'] = res.body.data.authToken;
					userCredentials['X-User-Id'] = res.body.data.userId;
				})
				.end(done);
		});

		it('should enable user', (done) => {
			request.post(api('admin.enableUser'))
				.set(credentials)
				.send({
					userId: user._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.end(done);
		});

		it('should get subscritions', (done) => {
			request.get(api('subscriptions.get'))
				.set(userCredentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.end(done);
		});
	});

	describe('set user visibility', () => {
		let user;
		before((done) => {
			const username = `user.test.${ Date.now() }`;
			const email = `${ username }@rocket.chat`;
			request.post(api('users.create'))
				.set(credentials)
				.send({ email, name: username, username, password })
				.end((err, res) => {
					user = res.body.user;
					done();
				});
		});

		let userCredentials;
		before((done) => {
			request.post(api('login'))
				.send({
					user: user.username,
					password,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					userCredentials = {};
					userCredentials['X-Auth-Token'] = res.body.data.authToken;
					userCredentials['X-User-Id'] = res.body.data.userId;
				})
				.end(done);
		});
		after((done) => {
			request.post(api('users.delete')).set(credentials).send({
				userId: user._id,
			}).end(done);
			user = undefined;
		});

		it('error if empty body', (done) => {
			request.post(api('admin.setUserVisibility'))
				.set(credentials)
				.send({})
				.expect('Content-Type', 'application/json')
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('errorType', 'error-invalid-params');
				})
				.end(done);
		});

		it('error if only userId', (done) => {
			request.post(api('admin.setUserVisibility'))
				.set(credentials)
				.send({
					userId: user._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('errorType', 'error-invalid-params');
				})
				.end(done);
		});

		it('should set invisible', (done) => {
			request.post(api('admin.setUserVisibility'))
				.set(credentials)
				.send({
					userId: user._id,
					isVisible: false,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('should set visible', (done) => {
			request.post(api('admin.setUserVisibility'))
				.set(credentials)
				.send({
					userId: user._id,
					isVisible: true,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

	});

	describe('notify user', () => {
		it('should success', (done) => {
			request.post(api('admin.notifyUser'))
				.set(credentials)
				.send({
					userId: 'rocket.cat',
					notifType: 'notifType',
					notifPayload: {},
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
	});

	describe('[/admin.getUserByUsername]', () => {
		const username = `user.test.get.by.username.${ Date.now() }`;
		const email = `${ username }@rocket.chat`;

		before(() => request.post(api('users.create'))
			.set(credentials)
			.send({ email, name: username, username, password })
			.expect(200));

		it('should error if username is not passed', (done) => {
			request.get(api('admin.getUserByUsername'))
				.set(credentials)
				.query({})
				.expect('Content-Type', 'application/json')
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
				})
				.end(done);
		});

		it('should error if username is invalid', (done) => {
			request.get(api('admin.getUserByUsername'))
				.set(credentials)
				.query({
					username: `${ username }-invalid`,
				})
				.expect('Content-Type', 'application/json')
				.expect(404)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
				})
				.end(done);
		});

		it('should query information about a user by username', (done) => {
			request.get(api('admin.getUserByUsername'))
				.set(credentials)
				.query({
					username,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('user.username', username);
					expect(res.body).to.have.nested.property('user.emails[0].address', email);
					expect(res.body).to.have.nested.property('user.active', true);
					expect(res.body).to.have.nested.property('user.name', username);
					expect(res.body).to.not.have.nested.property('user.e2e');
					expect(res.body).to.not.have.nested.property('services');
				})
				.end(done);
		});

		it('should query information about a user by username with case permutations', (done) => {
			function capitalizeFirstLetter(string) {
				return string.charAt(0).toUpperCase() + string.slice(1);
			}
			const capitalizedUsername = capitalizeFirstLetter(username);
			request.get(api('admin.getUserByUsername'))
				.set(credentials)
				.query({
					username: capitalizedUsername,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('user.username', username);
					expect(res.body).to.have.nested.property('user.emails[0].address', email);
					expect(res.body).to.have.nested.property('user.active', true);
					expect(res.body).to.have.nested.property('user.name', username);
					expect(res.body).to.not.have.nested.property('user.e2e');
					expect(res.body).to.not.have.nested.property('services');
					expect(capitalizedUsername).to.not.equal(username);
				})
				.end(done);
		});
	});

	describe('get passwords', () => {
		it('should error', (done) => {
			request.get(api('admin.getPasswords'))
				.set(credentials)
				.expect('Content-Type', 'application/json')
				.expect(400)
				.end(done);
		});

		it('should success', (done) => {
			request.get(api('admin.getPasswords'))
				.set(credentials)
				.query({
					ids: 'rocket.cat',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('result');
					expect(res.body.result).to.have.property('rocket.cat');
				})
				.end(done);
		});
	});

});
