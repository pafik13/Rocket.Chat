import { expect } from 'chai';

import { getCredentials, api, request, credentials } from '../../data/api-data.js';
import { password } from '../../data/user';
import { closeRoom, createRoom } from '../../data/rooms.helper';
import { updatePermission } from '../../data/permissions.helper';
import { imgURL, vidURL } from '../../data/interactions';


function getMessages(roomId, roomType) {
	return new Promise((resolve/* , reject*/) => {
		request.get(api(`${ roomType }.messages`))
			.set(credentials)
			.query({
				roomId,
			})
			.end((err, req) => {
				resolve(req.body);
			});
	});
}

describe('[Rooms]', function() {
	this.retries(0);

	before((done) => getCredentials(done));

	it('/rooms.get', (done) => {
		request.get(api('rooms.get'))
			.set(credentials)
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.property('update');
				expect(res.body).to.have.property('remove');
			})
			.end(done);
	});

	it('/rooms.get?updatedSince', (done) => {
		request.get(api('rooms.get'))
			.set(credentials)
			.query({
				updatedSince: new Date,
			})
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.property('update').that.have.lengthOf(0);
				expect(res.body).to.have.property('remove').that.have.lengthOf(0);
			})
			.end(done);
	});

	describe('/rooms.saveNotification', () => {
		let testChannel;
		it('create an channel', (done) => {
			createRoom({ type: 'c', name: `channel.test.${ Date.now() }` })
				.end((err, res) => {
					testChannel = res.body.channel;
					done();
				});
		});
		it('/rooms.saveNotification', (done) => {
			request.post(api('rooms.saveNotification'))
				.set(credentials)
				.send({
					roomId: testChannel._id,
					notifications: {
						disableNotifications: '0',
						emailNotifications: 'nothing',
						audioNotificationValue: 'beep',
						desktopNotifications: 'nothing',
						desktopNotificationDuration: '2',
						audioNotifications: 'all',
						mobilePushNotifications: 'mentions',
					},
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
	});

	describe('/rooms.saveNotificationMany', () => {
		let publicChannel; let privateChannel;
		it('create a public channel', (done) => {
			createRoom({ type: 'c', name: `testeChannel${ + new Date() }` })
				.end((err, res) => {
					publicChannel = res.body.channel;
					done();
				});
		});
		it('create a private channel', (done) => {
			createRoom({ type: 'p', name: `testPrivateChannel${ + new Date() }` })
				.end((err, res) => {
					privateChannel = res.body.group;
					done();
				});
		});
		it('/rooms.saveNotificationMany', (done) => {
			request.post(api('rooms.saveNotificationMany'))
				.set(credentials)
				.send({
					rooms: [
						{
							roomId: publicChannel._id,
							notifications: {
								disableNotifications: '0',
								emailNotifications: 'nothing',
								audioNotificationValue: 'beep',
								desktopNotifications: 'nothing',
								desktopNotificationDuration: '2',
								audioNotifications: 'all',
								mobilePushNotifications: 'mentions',
							},
						},
						{
							roomId: privateChannel._id,
							notifications: {
								disableNotifications: '0',
								emailNotifications: 'nothing',
								audioNotificationValue: 'beep',
								desktopNotifications: 'nothing',
								desktopNotificationDuration: '2',
								audioNotifications: 'all',
								mobilePushNotifications: 'mentions',
							},
						},
					],
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
	});

	describe('/rooms.favorite', () => {
		let testChannel;
		const testChannelName = `channel.test.${ Date.now() }`;
		it('create an channel', (done) => {
			createRoom({ type: 'c', name: testChannelName })
				.end((err, res) => {
					testChannel = res.body.channel;
					done();
				});
		});
		it('should favorite the room when send favorite: true by roomName', (done) => {
			request.post(api('rooms.favorite'))
				.set(credentials)
				.send({
					roomName: testChannelName,
					favorite: true,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		it('should unfavorite the room when send favorite: false by roomName', (done) => {
			request.post(api('rooms.favorite'))
				.set(credentials)
				.send({
					roomName: testChannelName,
					favorite: false,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		it('should favorite the room when send favorite: true by roomId', (done) => {
			request.post(api('rooms.favorite'))
				.set(credentials)
				.send({
					roomId: testChannel._id,
					favorite: true,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('should unfavorite room when send favorite: false by roomId', (done) => {
			request.post(api('rooms.favorite'))
				.set(credentials)
				.send({
					roomId: testChannel._id,
					favorite: false,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('should return an error when send an invalid room', (done) => {
			request.post(api('rooms.favorite'))
				.set(credentials)
				.send({
					roomId: 'foo',
					favorite: false,
				})
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('error');
				})
				.end(done);
		});
	});

	describe('/rooms.markAsFavorite', () => {
		let publicChannel;
		it('create a public channel', (done) => {
			createRoom({ type: 'c', name: `testeChannel${ + new Date() }` })
				.end((err, res) => {
					publicChannel = res.body.channel;
					done();
				});
		});
		it('/rooms.markAsFavorite', (done) => {
			request.post(api('rooms.markAsFavorite'))
				.set(credentials)
				.send({
					roomName: publicChannel.name,
					favorite: true,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
	});

	describe('/rooms.markAsFavoriteMany', () => {
		let publicChannel; let privateChannel;
		it('create a public channel', (done) => {
			createRoom({ type: 'c', name: `testeChannel${ + new Date() }` })
				.end((err, res) => {
					publicChannel = res.body.channel;
					done();
				});
		});
		it('create a private channel', (done) => {
			createRoom({ type: 'p', name: `testPrivateChannel${ + new Date() }` })
				.end((err, res) => {
					privateChannel = res.body.group;
					done();
				});
		});
		it('/rooms.markAsFavorite', (done) => {
			request.post(api('rooms.markAsFavoriteMany'))
				.set(credentials)
				.send({
					rooms: [
						{ roomName: publicChannel.name, favorite: true },
						{ roomName: privateChannel.name, favorite: true },
					],
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
	});

	describe('[/rooms.cleanHistory]', () => {
		let publicChannel;
		let privateChannel;
		let directMessageChannel;
		let user;
		beforeEach((done) => {
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
		beforeEach((done) => {
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
		afterEach((done) => {
			request.post(api('users.delete')).set(credentials).send({
				userId: user._id,
			}).end(done);
			user = undefined;
		});
		it('create a public channel', (done) => {
			createRoom({ type: 'c', name: `testeChannel${ +new Date() }` })
				.end((err, res) => {
					publicChannel = res.body.channel;
					done();
				});
		});
		it('create a private channel', (done) => {
			createRoom({ type: 'p', name: `testPrivateChannel${ +new Date() }` })
				.end((err, res) => {
					privateChannel = res.body.group;
					done();
				});
		});
		it('create a direct message', (done) => {
			createRoom({ type: 'd', username: 'rocket.cat' })
				.end((err, res) => {
					directMessageChannel = res.body.room;
					done();
				});
		});
		it('should return success when send a valid public channel', (done) => {
			request.post(api('rooms.cleanHistory'))
				.set(credentials)
				.send({
					roomId: publicChannel._id,
					latest: '2016-12-09T13:42:25.304Z',
					oldest: '2016-08-30T13:42:25.304Z',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		it('should return success when send a valid private channel', (done) => {
			request.post(api('rooms.cleanHistory'))
				.set(credentials)
				.send({
					roomId: privateChannel._id,
					latest: '2016-12-09T13:42:25.304Z',
					oldest: '2016-08-30T13:42:25.304Z',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		it('should return success when send a valid Direct Message channel', (done) => {
			request.post(api('rooms.cleanHistory'))
				.set(credentials)
				.send({
					roomId: directMessageChannel._id,
					latest: '2016-12-09T13:42:25.304Z',
					oldest: '2016-08-30T13:42:25.304Z',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		it('should return not allowed error when try deleting messages with user without permission', (done) => {
			request.post(api('rooms.cleanHistory'))
				.set(userCredentials)
				.send({
					roomId: directMessageChannel._id,
					latest: '2016-12-09T13:42:25.304Z',
					oldest: '2016-08-30T13:42:25.304Z',
				})
				.expect('Content-Type', 'application/json')
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('errorType', 'error-not-allowed');
				})
				.end(done);
		});
	});

	describe('[/rooms.info]', () => {
		let testChannel;
		let testGroup;
		let testDM;
		const channelExpectedKeys = [
			'_id', 'name', 'fname', 't', 'msgs', 'usersCount', 'u', 'customFields', 'ts', 'sysMes', 'filesHidden', 'country', 'messageEventsCount',
			'lastMessage', '_updatedAt', 'isImageFilesAllowed', 'isAudioFilesAllowed', 'isVideoFilesAllowed', 'isOtherFilesAllowed', 'default', 'ro', 'lm',
		];
		const groupExpectedKeys = Array.from(channelExpectedKeys);
		groupExpectedKeys.push('membersHidden');
		const testChannelName = `channel.test.${ Date.now() }-${ Math.random() }`;
		const testGroupName = `group.test.${ Date.now() }-${ Math.random() }`;
		after((done) => {
			closeRoom({ type: 'd', roomId: testDM._id })
				.then(done);
		});
		it('create an channel', (done) => {
			createRoom({ type: 'c', name: testChannelName })
				.end((err, res) => {
					testChannel = res.body.channel;
					done();
				});
		});
		it('create a group', (done) => {
			createRoom(({ type: 'p', name: testGroupName }))
				.end((err, res) => {
					testGroup = res.body.group;
					done();
				});
		});
		it('create a Direct message room with rocket.cat', (done) => {
			createRoom(({ type: 'd', username: 'rocket.cat' }))
				.end((err, res) => {
					testDM = res.body.room;
					done();
				});
		});
		it('should return the info about the created channel correctly searching by roomId', (done) => {
			request.get(api('rooms.info'))
				.set(credentials)
				.query({
					roomId: testChannel._id,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('room').and.to.be.an('object');
					expect(res.body.room).to.have.keys(channelExpectedKeys);
				})
				.end(done);
		});
		it('should return the info about the created channel correctly searching by roomName', (done) => {
			request.get(api('rooms.info'))
				.set(credentials)
				.query({
					roomName: testChannel.name,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('room').and.to.be.an('object');
					expect(res.body.room).to.have.all.keys(channelExpectedKeys);
				})
				.end(done);
		});
		it('should return the info about the created group correctly searching by roomId', (done) => {
			request.get(api('rooms.info'))
				.set(credentials)
				.query({
					roomId: testGroup._id,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('room').and.to.be.an('object');
					expect(res.body.room).to.have.all.keys(groupExpectedKeys);
				})
				.end(done);
		});
		it('should return the info about the created group correctly searching by roomName', (done) => {
			request.get(api('rooms.info'))
				.set(credentials)
				.query({
					roomName: testGroup.name,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('room').and.to.be.an('object');
					expect(res.body.room).to.have.all.keys(groupExpectedKeys);
				})
				.end(done);
		});
		it('should return the info about the created DM correctly searching by roomId', (done) => {
			request.get(api('rooms.info'))
				.set(credentials)
				.query({
					roomId: testDM._id,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('room').and.to.be.an('object');
				})
				.end(done);
		});
		it('should return name and _id of public channel when it has the "fields" query parameter limiting by name', (done) => {
			request.get(api('rooms.info'))
				.set(credentials)
				.query({
					roomId: testChannel._id,
					fields: JSON.stringify({ name: 1 }),
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('room').and.to.be.an('object');
					expect(res.body.room).to.have.property('name').and.to.be.equal(testChannelName);
					expect(res.body.room).to.have.all.keys(['_id', 'name']);
				})
				.end(done);
		});
	});

	describe('[/rooms.leave]', () => {
		let testChannel;
		let testGroup;
		let testDM;
		const testChannelName = `channel.test.${ Date.now() }-${ Math.random() }`;
		const testGroupName = `group.test.${ Date.now() }-${ Math.random() }`;
		after((done) => {
			closeRoom({ type: 'd', roomId: testDM._id })
				.then(done);
		});
		it('create an channel', (done) => {
			createRoom({ type: 'c', name: testChannelName })
				.end((err, res) => {
					testChannel = res.body.channel;
					done();
				});
		});
		it('create a group', (done) => {
			createRoom(({ type: 'p', name: testGroupName }))
				.end((err, res) => {
					testGroup = res.body.group;
					done();
				});
		});
		it('create a Direct message room with rocket.cat', (done) => {
			createRoom(({ type: 'd', username: 'rocket.cat' }))
				.end((err, res) => {
					testDM = res.body.room;
					done();
				});
		});
		it('should return an Error when trying to leave a public channel and you are the last owner', (done) => {
			request.post(api('rooms.leave'))
				.set(credentials)
				.send({
					roomId: testChannel._id,
				})
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('errorType', 'error-you-are-last-owner');
				})
				.end(done);
		});
		it('should return an Error when trying to leave a private group and you are the last owner', (done) => {
			request.post(api('rooms.leave'))
				.set(credentials)
				.send({
					roomId: testGroup._id,
				})
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('errorType', 'error-you-are-last-owner');
				})
				.end(done);
		});
		it('should return an Error when trying to leave a public channel and not have the necessary permission(leave-c)', (done) => {
			updatePermission('leave-c', []).then(() => {
				request.post(api('rooms.leave'))
					.set(credentials)
					.send({
						roomId: testChannel._id,
					})
					.expect(400)
					.expect((res) => {
						expect(res.body).to.have.property('success', false);
						expect(res.body).to.have.property('errorType', 'error-not-allowed');
					})
					.end(done);
			});
		});
		it('should return an Error when trying to leave a private group and not have the necessary permission(leave-p)', (done) => {
			updatePermission('leave-p', []).then(() => {
				request.post(api('rooms.leave'))
					.set(credentials)
					.send({
						roomId: testGroup._id,
					})
					.expect(400)
					.expect((res) => {
						expect(res.body).to.have.property('success', false);
						expect(res.body).to.have.property('errorType', 'error-not-allowed');
					})
					.end(done);
			});
		});
		it('should leave the DM room', (done) => {
			request.post(api('rooms.leave'))
				.set(credentials)
				.send({
					roomId: testDM._id,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		it('should leave the public channel when the room has at least another owner and the user has the necessary permission(leave-c)', (done) => {
			updatePermission('leave-c', ['admin']).then(() => {
				request.post(api('channels.addAll'))
					.set(credentials)
					.send({
						roomId: testChannel._id,
					})
					.end(() => {
						request.post(api('channels.addOwner'))
							.set(credentials)
							.send({
								roomId: testChannel._id,
								userId: 'rocket.cat',
							})
							.end(() => {
								request.post(api('rooms.leave'))
									.set(credentials)
									.send({
										roomId: testChannel._id,
									})
									.expect(200)
									.expect((res) => {
										expect(res.body).to.have.property('success', true);
									})
									.end(done);
							});
					});
			});
		});
		it('should leave the private group when the room has at least another owner and the user has the necessary permission(leave-p)', (done) => {
			updatePermission('leave-p', ['admin']).then(() => {
				request.post(api('groups.addAll'))
					.set(credentials)
					.send({
						roomId: testGroup._id,
					})
					.end(() => {
						request.post(api('groups.addOwner'))
							.set(credentials)
							.send({
								roomId: testGroup._id,
								userId: 'rocket.cat',
							})
							.end(() => {
								request.post(api('rooms.leave'))
									.set(credentials)
									.send({
										roomId: testGroup._id,
									})
									.expect(200)
									.expect((res) => {
										expect(res.body).to.have.property('success', true);
									})
									.end(done);
							});
					});
			});
		});
	});

	describe('[/rooms.uploadAvatar (channel/group)]', () => {
		let testChannel;
		let testGroup;
		const testChannelName = `channel.test.${ Date.now() }-${ Math.random() }`;
		const testGroupName = `group.test.${ Date.now() }-${ Math.random() }`;


		const channelNewName = `channel-name-${ Date.now() }`;
		const channelNewDesc = `channel-desc-${ Date.now() }`;
		const groupNewName = `group-name-${ Date.now() }`;
		const groupNewDesc = `group-desc-${ Date.now() }`;

		it('create an channel', (done) => {
			createRoom({ type: 'c', name: testChannelName })
				.end((err, res) => {
					testChannel = res.body.channel;
					done();
				});
		});
		it('create a group', (done) => {
			createRoom(({ type: 'p', name: testGroupName }))
				.end((err, res) => {
					testGroup = res.body.group;
					done();
				});
		});
		it('/rooms.uploadAvatar - channel', (done) => {
			request.post(api(`rooms.uploadAvatar/${ testChannel._id }`))
				.set(credentials)
				.attach('file', imgURL)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('/rooms.uploadAvatar - group', (done) => {
			request.post(api(`rooms.uploadAvatar/${ testGroup._id }`))
				.set(credentials)
				.attach('file', imgURL)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('should return channel info by roomId', (done) => {
			request.get(api('rooms.info'))
				.set(credentials)
				.query({
					roomId: testChannel._id,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('room').and.to.be.an('object');
					expect(res.body.room).to.have.property('customFields').and.to.be.an('object');
					expect(res.body.room.customFields).to.have.property('photoUrl').and.to.be.not.equal('');
					testChannel = res.body.room;
				})
				.end(done);
		});
		it('should update channel by roomId', (done) => {
			request.post(api(`rooms.uploadAvatar/${ testChannel._id }`))
				.set(credentials)
				.attach('file', imgURL)
				.field({
					name: channelNewName,
					description: channelNewDesc,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		it('should return new channel info by roomId', (done) => {
			request.get(api('rooms.info'))
				.set(credentials)
				.query({
					roomId: testChannel._id,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('room').and.to.be.an('object');
					expect(res.body.room).to.have.property('name', channelNewName);
					expect(res.body.room).to.have.property('description', channelNewDesc);
					expect(res.body.room).to.have.property('customFields').and.to.be.an('object');
					expect(res.body.room.customFields).to.have.property('photoUrl').and.to.be.not.equal('');
					expect(res.body.room.customFields.photoUrl).is.not.equal(testChannel.customFields.photoUrl);
				})
				.end(done);
		});

		it('should return group info by roomId', (done) => {
			request.get(api('rooms.info'))
				.set(credentials)
				.query({
					roomId: testGroup._id,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('room').and.to.be.an('object');
					expect(res.body.room).to.have.property('customFields').and.to.be.an('object');
					expect(res.body.room.customFields).to.have.property('photoUrl').and.to.be.not.equal('');
					testGroup = res.body.room;
				})
				.end(done);
		});
		it('should update group by roomId', (done) => {
			request.post(api(`rooms.uploadAvatar/${ testGroup._id }`))
				.set(credentials)
				.attach('file', imgURL)
				.field({
					name: groupNewName,
					description: groupNewDesc,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		it('should return new group info by roomId', (done) => {
			request.get(api('rooms.info'))
				.set(credentials)
				.query({
					roomId: testGroup._id,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('room').and.to.be.an('object');
					expect(res.body.room).to.have.property('name', groupNewName);
					expect(res.body.room).to.have.property('description', groupNewDesc);
					expect(res.body.room).to.have.property('customFields').and.to.be.an('object');
					expect(res.body.room.customFields).to.have.property('photoUrl').and.to.be.not.equal('');
					expect(res.body.room.customFields.photoUrl).is.not.equal(testGroup.customFields.photoUrl);
				})
				.end(done);
		});
	});

	describe('[/rooms.update (channel/group) and deleteMany]', () => {
		let testChannel;
		let testGroup;
		const testChannelName = `channel.test.${ Date.now() }-${ Math.random() }`;
		const testGroupName = `group.test.${ Date.now() }-${ Math.random() }`;


		const channelNewName = `channel-name-${ Date.now() }-${ Math.random() }`;
		const channelNewDesc = `channel-desc-${ Date.now() }-${ Math.random() }`;
		const groupNewName = `group-name-${ Date.now() }-${ Math.random() }`;
		const groupNewDesc = `group-desc-${ Date.now() }-${ Math.random() }`;

		it('create an channel', (done) => {
			createRoom({ type: 'c', name: testChannelName })
				.end((err, res) => {
					testChannel = res.body.channel;
					done();
				});
		});
		it('create a group', (done) => {
			createRoom(({ type: 'p', name: testGroupName }))
				.end((err, res) => {
					testGroup = res.body.group;
					done();
				});
		});

		it('should return channel info by roomId', (done) => {
			request.get(api('rooms.info'))
				.set(credentials)
				.query({
					roomId: testChannel._id,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('room').and.to.be.an('object');
					expect(res.body.room).to.have.property('customFields').and.to.be.an('object');
					expect(res.body.room.customFields).to.have.property('photoUrl').and.to.be.equal('');
					testChannel = res.body.room;
				})
				.end(done);
		});

		it('/rooms.update - channel', (done) => {
			request.post(api(`rooms.update/${ testChannel._id }`))
				.set(credentials)
				.send({
					name: channelNewName,
					description: channelNewDesc,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('should return new channel info by roomId', (done) => {
			request.get(api('rooms.info'))
				.set(credentials)
				.query({
					roomId: testChannel._id,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('room').and.to.be.an('object');
					expect(res.body.room).to.have.property('name', channelNewName);
					expect(res.body.room).to.have.property('description', channelNewDesc);
					expect(res.body.room).to.have.property('customFields').and.to.be.an('object');
					expect(res.body.room.customFields).to.have.property('photoUrl').and.to.be.equal('');
				})
				.end(done);
		});

		it('should return group info by roomId', (done) => {
			request.get(api('rooms.info'))
				.set(credentials)
				.query({
					roomId: testGroup._id,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('room').and.to.be.an('object');
					expect(res.body.room).to.have.property('customFields').and.to.be.an('object');
					expect(res.body.room.customFields).to.have.property('photoUrl').and.to.be.equal('');
					testGroup = res.body.room;
				})
				.end(done);
		});

		it('should update group by roomId', (done) => {
			request.post(api(`rooms.update/${ testGroup._id }`))
				.set(credentials)
				.send({
					name: groupNewName,
					description: groupNewDesc,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('should return new group info by roomId', (done) => {
			request.get(api('rooms.info'))
				.set(credentials)
				.query({
					roomId: testGroup._id,
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('room').and.to.be.an('object');
					expect(res.body.room).to.have.property('name', groupNewName);
					expect(res.body.room).to.have.property('description', groupNewDesc);
					expect(res.body.room).to.have.property('customFields').and.to.be.an('object');
					expect(res.body.room.customFields).to.have.property('photoUrl').and.to.be.equal('');
				})
				.end(done);
		});

		it('should delete rooms by id or name', (done) => {
			request.post(api('rooms.deleteMany'))
				.set(credentials)
				.send({
					rooms: [{
						roomId: testGroup._id,
					}, {
						roomName: channelNewName,
					}],
				})
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
	});

	describe('[/rooms.uploads (channel/group)]', () => {
		let testChannel;
		let testGroup;
		const testChannelName = `channel.test.${ Date.now() }-${ Math.random() }`;
		const testGroupName = `group.test.${ Date.now() }-${ Math.random() }`;
		it('create an channel', (done) => {
			createRoom({ type: 'c', name: testChannelName })
				.end((err, res) => {
					testChannel = res.body.channel;
					done();
				});
		});
		it('create a group', (done) => {
			createRoom(({ type: 'p', name: testGroupName }))
				.end((err, res) => {
					testGroup = res.body.group;
					done();
				});
		});

		it('/channels.files - before image upload', (done) => {
			request.get(api(`channels.files?roomId=${ testChannel._id }`))
				.set(credentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('files').that.is.an('array').that.has.lengthOf(0);
				})
				.end(done);
		});

		it('/rooms.upload - channel', (done) => {
			request.post(api(`rooms.upload/${ testChannel._id }`))
				.set(credentials)
				.attach('file', imgURL)
				.field({
					msg: 'This is a message with a file',
					description: 'Simple text file',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('/channels.files - after image upload', (done) => {
			request.get(api(`channels.files?roomId=${ testChannel._id }`))
				.set(credentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('files').that.is.an('array').that.has.lengthOf(1);
				})
				.end(done);
		});

		it('/groups.files - before image upload', (done) => {
			request.get(api(`groups.files?roomId=${ testGroup._id }`))
				.set(credentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('files').that.is.an('array').that.has.lengthOf(0);
				})
				.end(done);
		});

		it('/rooms.upload - group', (done) => {
			request.post(api(`rooms.upload/${ testGroup._id }`))
				.set(credentials)
				.attach('file', imgURL)
				.field({
					msg: 'This is a message with a file',
					description: 'Simple text file',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('/groups.files - after image upload', (done) => {
			request.get(api(`groups.files?roomId=${ testGroup._id }`))
				.set(credentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('files').that.is.an('array').that.has.lengthOf(1);
				})
				.end(done);
		});

		it('/rooms.deleteFileMessage - channel', async() => {
			const { messages } = await getMessages(testChannel._id, 'channels');
			const message = messages[0];
			return request.post(api('rooms.deleteFileMessage'))
				.set(credentials)
				.send({
					fileId: message.file._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				});
		});

		it('/rooms.deleteFileMessage - group', async() => {
			const { messages } = await getMessages(testGroup._id, 'groups');
			const message = messages[0];
			return request.post(api('rooms.deleteFileMessage'))
				.set(credentials)
				.send({
					fileId: message.file._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				});
		});

		it('/channels.files - before video upload', (done) => {
			request.get(api(`channels.files?roomId=${ testChannel._id }`))
				.set(credentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('files').that.is.an('array').that.has.lengthOf(0);
				})
				.end(done);
		});

		it('/rooms.upload - channel', (done) => {
			request.post(api(`rooms.upload/${ testChannel._id }`))
				.set(credentials)
				.attach('file', vidURL)
				.field({
					msg: 'Sent video',
					description: 'Simple video file',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('/channels.files - after video upload', (done) => {
			request.get(api(`channels.files?roomId=${ testChannel._id }`))
				.set(credentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('files').that.is.an('array').that.has.lengthOf(1);
					const [file] = res.body.files;
					expect(file).to.have.property('identify');
					expect(file.identify).to.have.property('preview');
					expect(file).to.have.property('video_preview');
					expect(file.video_preview).to.have.property('url');
				})
				.end(done);
		});

		it('/groups.files - before video upload', (done) => {
			request.get(api(`groups.files?roomId=${ testGroup._id }`))
				.set(credentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('files').that.is.an('array').that.has.lengthOf(0);
				})
				.end(done);
		});

		it('/rooms.upload - group', (done) => {
			request.post(api(`rooms.upload/${ testGroup._id }`))
				.set(credentials)
				.attach('file', vidURL)
				.field({
					msg: 'Sent video',
					description: 'Simple video file',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('/groups.files - after video upload', (done) => {
			request.get(api(`groups.files?roomId=${ testGroup._id }`))
				.set(credentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('files').that.is.an('array').that.has.lengthOf(1);
					const [file] = res.body.files;
					expect(file).to.have.property('identify');
					expect(file.identify).to.have.property('preview');
					expect(file).to.have.property('video_preview');
					expect(file.video_preview).to.have.property('url');
				})
				.end(done);
		});
	});

});
