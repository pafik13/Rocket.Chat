import { expect } from 'chai';

import {
	getCredentials,
	api,
	request,
	credentials,
	apiPublicChannelName,
	channel,
} from '../../data/api-data.js';
import { adminUsername, password } from '../../data/user.js';
import { imgURL } from '../../data/interactions';

function getRoomInfo(roomId) {
	return new Promise((resolve/* , reject*/) => {
		request.get(api('channels.info'))
			.set(credentials)
			.query({
				roomId,
			})
			.end((err, req) => {
				resolve(req.body);
			});
	});
}

describe('[Channels]', function() {
	this.retries(0);

	before((done) => getCredentials(done));

	it('/channels.create', (done) => {
		request.post(api('channels.create'))
			.set(credentials)
			.send({
				name: apiPublicChannelName,
				location: {
					type: 'Point',
					coordinates: [33, 55],
				},
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('channel._id');
				expect(res.body).to.have.nested.property('channel.name', apiPublicChannelName);
				expect(res.body).to.have.nested.property('channel.t', 'c');
				expect(res.body).to.have.nested.property('channel.msgs', 1);
				expect(res.body).to.have.nested.property('channel.filesHidden', false);
				channel._id = res.body.channel._id;
			})
			.end(done);
	});

	it('/channels.createWithAvatar', (done) => {
		request.post(api('channels.createWithAvatar'))
			.set(credentials)
			.attach('file', imgURL)
			.field({
				name: `channel-createWithAvatar-${ Date.now() }`,
				readOnly: false,
				filesHidden: true,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.property('channel');
				expect(res.body).to.have.property('s3_result');
			})
			.end(done);
	});

	describe('[/channels.info]', () => {
		let testChannel = {};
		let channelMessage = {};
		it('creating new channel...', (done) => {
			request.post(api('channels.create'))
				.set(credentials)
				.send({
					name: apiPublicChannelName,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					testChannel = res.body.channel;
				})
				.end(done);
		});
		it('should return channel basic structure', (done) => {
			request.get(api('channels.info'))
				.set(credentials)
				.query({
					roomId: testChannel._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('channel._id');
					expect(res.body).to.have.nested.property('channel.name', apiPublicChannelName);
					expect(res.body).to.have.nested.property('channel.t', 'c');
					expect(res.body).to.have.nested.property('channel.msgs', 1);
					expect(res.body).to.have.nested.property('channel.filesHidden', false);
				})
				.end(done);
		});
		it('sending a message...', (done) => {
			request.post(api('chat.sendMessage'))
				.set(credentials)
				.send({
					message: {
						text: 'Sample message',
						rid: testChannel._id,
					},
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					channelMessage = res.body.message;
				})
				.end(done);
		});
		it('REACTing with last message', (done) => {
			request.post(api('chat.react'))
				.set(credentials)
				.send({
					emoji: ':squid:',
					messageId: channelMessage._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		it('STARring last message', (done) => {
			request.post(api('chat.starMessage'))
				.set(credentials)
				.send({
					messageId: channelMessage._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		it('PINning last message', (done) => {
			request.post(api('chat.pinMessage'))
				.set(credentials)
				.send({
					messageId: channelMessage._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		it('should return channel structure with "lastMessage" object including pin, reaction and star(should be an array) infos', (done) => {
			request.get(api('channels.info'))
				.set(credentials)
				.query({
					roomId: testChannel._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('channel').and.to.be.an('object');
					const { channel } = res.body;
					expect(channel).to.have.property('lastMessage').and.to.be.an('object');
					expect(channel.lastMessage).to.have.property('t', 'message_pinned');
				})
				.end(done);
		});
		it('should return all channels messages where the last message of array should have the "star" array with USERS star ONLY', (done) => {
			request.get(api('channels.messages'))
				.set(credentials)
				.query({
					roomId: testChannel._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('messages').and.to.be.an('array');
					const { messages } = res.body;
					const lastMessage = messages.filter((message) => message._id === channelMessage._id)[0];
					expect(lastMessage).to.have.property('starred').and.to.be.an('array');
					expect(lastMessage.starred[0]._id).to.be.equal(adminUsername);
					expect(lastMessage).to.have.property('reactions').and.to.be.an('object');
					expect(lastMessage).to.have.property('pinned').and.to.be.a('boolean');
					expect(lastMessage).to.have.property('pinnedAt').and.to.be.a('string');
					expect(lastMessage).to.have.property('pinnedBy').and.to.be.an('object');
				})
				.end(done);
		});
	});

	it('/channels.invite', async() => {
		const roomInfo = await getRoomInfo(channel._id);

		return request.post(api('channels.invite'))
			.set(credentials)
			.send({
				roomId: channel._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('channel._id');
				expect(res.body).to.have.nested.property('channel.name', apiPublicChannelName);
				expect(res.body).to.have.nested.property('channel.t', 'c');
				expect(res.body).to.have.nested.property('channel.msgs', roomInfo.channel.msgs + 1);
			});
	});

	it('/channels.addModerator', (done) => {
		request.post(api('channels.addModerator'))
			.set(credentials)
			.send({
				roomId: channel._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/channels.removeModerator', (done) => {
		request.post(api('channels.removeModerator'))
			.set(credentials)
			.send({
				roomId: channel._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/channels.addOwner', (done) => {
		request.post(api('channels.addOwner'))
			.set(credentials)
			.send({
				roomId: channel._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/channels.removeOwner', (done) => {
		request.post(api('channels.removeOwner'))
			.set(credentials)
			.send({
				roomId: channel._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/channels.kick', async() => {
		const roomInfo = await getRoomInfo(channel._id);

		return request.post(api('channels.kick'))
			.set(credentials)
			.send({
				roomId: channel._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('channel._id');
				expect(res.body).to.have.nested.property('channel.name', apiPublicChannelName);
				expect(res.body).to.have.nested.property('channel.t', 'c');
				expect(res.body).to.have.nested.property('channel.msgs', roomInfo.channel.msgs + 1);
			});
	});

	it('/channels.invite', async() => {
		const roomInfo = await getRoomInfo(channel._id);

		return request.post(api('channels.invite'))
			.set(credentials)
			.send({
				roomId: channel._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('channel._id');
				expect(res.body).to.have.nested.property('channel.name', apiPublicChannelName);
				expect(res.body).to.have.nested.property('channel.t', 'c');
				expect(res.body).to.have.nested.property('channel.msgs', roomInfo.channel.msgs + 1);
			});
	});

	it('/channels.addOwner', (done) => {
		request.post(api('channels.addOwner'))
			.set(credentials)
			.send({
				roomId: channel._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/channels.setDescription', (done) => {
		request.post(api('channels.setDescription'))
			.set(credentials)
			.send({
				roomId: channel._id,
				description: 'this is a description for a channel for api tests',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('description', 'this is a description for a channel for api tests');
			})
			.end(done);
	});

	it('/channels.setTopic', (done) => {
		request.post(api('channels.setTopic'))
			.set(credentials)
			.send({
				roomId: channel._id,
				topic: 'this is a topic of a channel for api tests',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('topic', 'this is a topic of a channel for api tests');
			})
			.end(done);
	});

	it('/channels.setAnnouncement', (done) => {
		request.post(api('channels.setAnnouncement'))
			.set(credentials)
			.send({
				roomId: channel._id,
				announcement: 'this is an announcement of a channel for api tests',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('announcement', 'this is an announcement of a channel for api tests');
			})
			.end(done);
	});

	it('/channels.setPurpose', (done) => {
		request.post(api('channels.setPurpose'))
			.set(credentials)
			.send({
				roomId: channel._id,
				purpose: 'this is a purpose of a channel for api tests',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('purpose', 'this is a purpose of a channel for api tests');
			})
			.end(done);
	});

	it('/channels.history', (done) => {
		request.get(api('channels.history'))
			.set(credentials)
			.query({
				roomId: channel._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.property('messages');
			})
			.end(done);
	});

	it('/channels.archive', (done) => {
		request.post(api('channels.archive'))
			.set(credentials)
			.send({
				roomId: channel._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/channels.unarchive', (done) => {
		request.post(api('channels.unarchive'))
			.set(credentials)
			.send({
				roomId: channel._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/channels.close', (done) => {
		request.post(api('channels.close'))
			.set(credentials)
			.send({
				roomId: channel._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/channels.close', (done) => {
		request.post(api('channels.close'))
			.set(credentials)
			.send({
				roomName: apiPublicChannelName,
			})
			.expect('Content-Type', 'application/json')
			.expect(400)
			.expect((res) => {
				expect(res.body).to.have.property('success', false);
				expect(res.body).to.have.property('error', `The channel, ${ apiPublicChannelName }, is already closed to the sender`);
			})
			.end(done);
	});

	it('/channels.open', (done) => {
		request.post(api('channels.open'))
			.set(credentials)
			.send({
				roomId: channel._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/channels.list', (done) => {
		request.get(api('channels.list'))
			.set(credentials)
			.query({
				roomId: channel._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.property('count');
				expect(res.body).to.have.property('total');
			})
			.end(done);
	});

	it('/channels.list.joined', (done) => {
		request.get(api('channels.list.joined'))
			.set(credentials)
			.query({
				roomId: channel._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.property('count');
				expect(res.body).to.have.property('total');
			})
			.end(done);
	});

	it('/channels.list.popular', (done) => {
		request.get(api('channels.list.popular'))
			.set(credentials)
			.query({})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.property('count');
				expect(res.body).to.have.property('total');
			})
			.end(done);
	});

	it('/channels.list.nearest', (done) => {
		request.get(api('channels.list.nearest'))
			.set(credentials)
			.query({
				lng: 33.1111,
				lat: 55.1111,
				minDistInMeters: 0,
				maxDistInMeters: 5000,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.property('count');
				expect(res.body).to.have.property('total');
			})
			.end(done);
	});

	it('/channels.counters', (done) => {
		request.get(api('channels.counters'))
			.set(credentials)
			.query({
				roomId: channel._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.property('joined', true);
				expect(res.body).to.have.property('members');
				expect(res.body).to.have.property('unreads');
				expect(res.body).to.have.property('unreadsFrom');
				expect(res.body).to.have.property('msgs');
				expect(res.body).to.have.property('latest');
				expect(res.body).to.have.property('userMentions');
			})
			.end(done);
	});

	it('/channels.members:mongo', (done) => {
		request.get(api('channels.members'))
			.set(credentials)
			.query({
				roomId: channel._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.property('members').and.to.be.an('array');
				expect(res.body).to.have.property('count');
				expect(res.body).to.have.property('total');
				expect(res.body).to.have.property('offset');
			})
			.end(done);
	});

	it('change Rooms_Members_Serch_Type to elastic', (done) => {
		request.post(api('settings/Use_elastic'))
			.set(credentials)
			.send({
				value: 'elastic',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/channels.members', (done) => {
		request.get(api('channels.members'))
			.set(credentials)
			.query({
				roomId: channel._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.property('members').and.to.be.an('array');
				expect(res.body).to.have.property('count');
				expect(res.body).to.have.property('total');
				expect(res.body).to.have.property('offset');
			})
			.end(done);
	});

	it('change Rooms_Members_Serch_Type to mongo', (done) => {
		request.post(api('settings/Rooms_Members_Serch_Type'))
			.set(credentials)
			.send({
				value: 'mongo',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/channels.rename', async() => {
		const roomInfo = await getRoomInfo(channel._id);

		return request.post(api('channels.rename'))
			.set(credentials)
			.send({
				roomId: channel._id,
				name: `EDITED${ apiPublicChannelName }`,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('channel._id');
				expect(res.body).to.have.nested.property('channel.name', `EDITED${ apiPublicChannelName }`);
				expect(res.body).to.have.nested.property('channel.t', 'c');
				expect(res.body).to.have.nested.property('channel.msgs', roomInfo.channel.msgs + 1);
			});
	});

	it('/channels.getIntegrations', (done) => {
		request.get(api('channels.getIntegrations'))
			.set(credentials)
			.query({
				roomId: channel._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.property('count', 0);
				expect(res.body).to.have.property('total', 0);
			})
			.end(done);
	});

	it('/channels.addAll', (done) => {
		request.post(api('channels.addAll'))
			.set(credentials)
			.send({
				roomId: channel._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('channel._id');
				expect(res.body).to.have.nested.property('channel.name', `EDITED${ apiPublicChannelName }`);
				expect(res.body).to.have.nested.property('channel.t', 'c');
			})
			.end(done);
	});

	it('/channels.addLeader', (done) => {
		request.post(api('channels.addLeader'))
			.set(credentials)
			.send({
				roomId: channel._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.a.property('success', true);
			})
			.end(done);
	});

	it('/channels.removeLeader', (done) => {
		request.post(api('channels.removeLeader'))
			.set(credentials)
			.send({
				roomId: channel._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	describe('[/channel.{accept,decline}]', () => {
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

		before((done) => {
			request.post(api('channels.invite'))
				.set(credentials)
				.send({
					roomName: apiPublicChannelName,
					userId: user._id,
				})
				.end(done);
		});
		after((done) => {
			request.post(api('users.delete')).set(credentials).send({
				userId: user._id,
			}).end(done);
			user = undefined;
		});
		it('should accept invite', (done) => {
			request.post(api('channels.accept'))
				.set(userCredentials)
				.send({
					roomName: apiPublicChannelName,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		it('should decline invite', (done) => {
			request.post(api('channels.decline'))
				.set(userCredentials)
				.send({
					roomName: apiPublicChannelName,
					reason: 'SPAM',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
	});

	describe('[/channel.kick with roles]', () => {
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

		before((done) => {
			request.post(api('channels.invite'))
				.set(credentials)
				.send({
					roomName: apiPublicChannelName,
					userId: user._id,
				})
				.end(done);
		});
		after((done) => {
			request.post(api('users.delete')).set(credentials).send({
				userId: user._id,
			}).end(done);
			user = undefined;
		});
		let moder1;
		before((done) => {
			const username = `moder1.test.${ Date.now() }`;
			const email = `${ username }@rocket.chat`;
			request.post(api('users.create'))
				.set(credentials)
				.send({ email, name: username, username, password })
				.end((err, res) => {
					moder1 = res.body.user;
					done();
				});
		});

		let moder1Credentials;
		before((done) => {
			request.post(api('login'))
				.send({
					user: moder1.username,
					password,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					moder1Credentials = {};
					moder1Credentials['X-Auth-Token'] = res.body.data.authToken;
					moder1Credentials['X-User-Id'] = res.body.data.userId;
				})
				.end(done);
		});

		before((done) => {
			request.post(api('channels.invite'))
				.set(credentials)
				.send({
					roomName: apiPublicChannelName,
					userId: moder1._id,
				})
				.end(done);
		});
		before((done) => {
			request.post(api('channels.addModerator'))
				.set(credentials)
				.send({
					roomName: apiPublicChannelName,
					userId: moder1._id,
				})
				.end(done);
		});
		after((done) => {
			request.post(api('users.delete')).set(credentials).send({
				userId: moder1._id,
			}).end(done);
			moder1 = undefined;
		});
		let moder2;
		before((done) => {
			const username = `moder2.test.${ Date.now() }`;
			const email = `${ username }@rocket.chat`;
			request.post(api('users.create'))
				.set(credentials)
				.send({ email, name: username, username, password })
				.end((err, res) => {
					moder2 = res.body.user;
					done();
				});
		});

		before((done) => {
			request.post(api('channels.invite'))
				.set(credentials)
				.send({
					roomName: apiPublicChannelName,
					userId: moder2._id,
				})
				.end(done);
		});
		before((done) => {
			request.post(api('channels.addModerator'))
				.set(credentials)
				.send({
					roomName: apiPublicChannelName,
					userId: moder2._id,
				})
				.end(done);
		});
		after((done) => {
			request.post(api('users.delete')).set(credentials).send({
				userId: moder2._id,
			}).end(done);
			moder2 = undefined;
		});
		let owner1;
		before((done) => {
			const username = `owner1.test.${ Date.now() }`;
			const email = `${ username }@rocket.chat`;
			request.post(api('users.create'))
				.set(credentials)
				.send({ email, name: username, username, password })
				.end((err, res) => {
					owner1 = res.body.user;
					done();
				});
		});

		let owner1Credentials;
		before((done) => {
			request.post(api('login'))
				.send({
					user: owner1.username,
					password,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					owner1Credentials = {};
					owner1Credentials['X-Auth-Token'] = res.body.data.authToken;
					owner1Credentials['X-User-Id'] = res.body.data.userId;
				})
				.end(done);
		});

		before((done) => {
			request.post(api('channels.invite'))
				.set(credentials)
				.send({
					roomName: apiPublicChannelName,
					userId: owner1._id,
				})
				.end(done);
		});
		before((done) => {
			request.post(api('channels.addOwner'))
				.set(credentials)
				.send({
					roomName: apiPublicChannelName,
					userId: owner1._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		after((done) => {
			request.post(api('users.delete')).set(credentials).send({
				userId: owner1._id,
			}).end(done);
			owner1 = undefined;
		});
		let owner2;
		before((done) => {
			const username = `owner2.test.${ Date.now() }`;
			const email = `${ username }@rocket.chat`;
			request.post(api('users.create'))
				.set(credentials)
				.send({ email, name: username, username, password })
				.end((err, res) => {
					owner2 = res.body.user;
					done();
				});
		});

		before((done) => {
			request.post(api('channels.invite'))
				.set(credentials)
				.send({
					roomName: apiPublicChannelName,
					userId: owner2._id,
				})
				.end(done);
		});
		before((done) => {
			request.post(api('channels.addOwner'))
				.set(credentials)
				.send({
					roomName: apiPublicChannelName,
					userId: owner2._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		after((done) => {
			request.post(api('users.delete')).set(credentials).send({
				userId: owner2._id,
			}).end(done);
			owner2 = undefined;
		});

		it('should return error when user try to kick moder', (done) => {
			request.post(api('channels.kick'))
				.set(userCredentials)
				.send({
					roomName: apiPublicChannelName,
					userId: moder1._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('errorType', 'error-not-allowed');
				})
				.end(done);
		});

		it('should return error when user try to kick owner', (done) => {
			request.post(api('channels.kick'))
				.set(userCredentials)
				.send({
					roomName: apiPublicChannelName,
					userId: owner1._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('errorType', 'error-not-allowed');
				})
				.end(done);
		});

		it('should return error when moder try to kick owner', (done) => {
			request.post(api('channels.kick'))
				.set(moder1Credentials)
				.send({
					roomName: apiPublicChannelName,
					userId: owner1._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('errorType', 'error-not-allowed');
				})
				.end(done);
		});

		it('moder should to kick moder', (done) => {
			request.post(api('channels.kick'))
				.set(moder1Credentials)
				.send({
					roomName: apiPublicChannelName,
					userId: moder2._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('owner should to kick owner', (done) => {
			request.post(api('channels.kick'))
				.set(owner1Credentials)
				.send({
					roomName: apiPublicChannelName,
					userId: owner2._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
	});

	describe('/channels.setCustomFields:', () => {
		let cfchannel;
		it('create channel with customFields', (done) => {
			const customFields = { field0:'value0', anonym_id: 'xxx' };
			request.post(api('channels.create'))
				.set(credentials)
				.send({
					name: `channel.cf.${ Date.now() }`,
					customFields,
				})
				.end((err, res) => {
					cfchannel = res.body.channel;
					done();
				});
		});
		it('get customFields using channels.info', (done) => {
			request.get(api('channels.info'))
				.set(credentials)
				.query({
					roomId: cfchannel._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('channel.customFields.field0', 'value0');
					expect(res.body).to.have.nested.property('channel.customFields.anonym_id', 'xxx');
					expect(res.body).to.have.nested.property('channel.customFields.photoUrl', '');
					expect(res.body).to.have.nested.property('channel.customFields.registeredAt', cfchannel.customFields.registeredAt);
				})
				.end(done);
		});
		it('change customFields', async() => {
			const customFields = { field9:'value9' };

			return request.post(api('channels.setCustomFields'))
				.set(credentials)
				.send({
					roomId: cfchannel._id,
					customFields,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('channel._id');
					expect(res.body).to.have.nested.property('channel.name', cfchannel.name);
					expect(res.body).to.have.nested.property('channel.t', 'c');
					expect(res.body).to.have.nested.property('channel.customFields.field9', 'value9');
					expect(res.body).to.have.nested.property('channel.customFields.field0', 'value0');
				});
		});
		it('get customFields using channels.info', (done) => {
			request.get(api('channels.info'))
				.set(credentials)
				.query({
					roomId: cfchannel._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('channel.customFields.field9', 'value9');
					expect(res.body).to.have.nested.property('channel.customFields.field0', 'value0');
				})
				.end(done);
		});
		it('delete channels with customFields', (done) => {
			request.post(api('channels.delete'))
				.set(credentials)
				.send({
					roomName: cfchannel.name,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		it('create channel without customFields', (done) => {
			request.post(api('channels.create'))
				.set(credentials)
				.send({
					name: `channel.cf.${ Date.now() }`,
				})
				.end((err, res) => {
					cfchannel = res.body.channel;
					done();
				});
		});
		it('set customFields with one nested field', (done) => {
			const customFields = { field1:'value1' };
			request.post(api('channels.setCustomFields'))
				.set(credentials)
				.send({
					roomId: cfchannel._id,
					customFields,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('channel._id');
					expect(res.body).to.have.nested.property('channel.name', cfchannel.name);
					expect(res.body).to.have.nested.property('channel.t', 'c');
					expect(res.body).to.have.nested.property('channel.customFields.field1', 'value1');
				})
				.end(done);
		});
		it('set customFields with multiple nested fields', (done) => {
			const customFields = { field2:'value2', field3:'value3', field4:'value4' };

			request.post(api('channels.setCustomFields'))
				.set(credentials)
				.send({
					roomName: cfchannel.name,
					customFields,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('channel._id');
					expect(res.body).to.have.nested.property('channel.name', cfchannel.name);
					expect(res.body).to.have.nested.property('channel.t', 'c');
					expect(res.body).to.have.nested.property('channel.customFields.field2', 'value2');
					expect(res.body).to.have.nested.property('channel.customFields.field3', 'value3');
					expect(res.body).to.have.nested.property('channel.customFields.field4', 'value4');
					expect(res.body).to.have.nested.property('channel.customFields.field1', 'value1');
				})
				.end(done);
		});
		it('set customFields to empty object', (done) => {
			const customFields = {};

			request.post(api('channels.setCustomFields'))
				.set(credentials)
				.send({
					roomName: cfchannel.name,
					customFields,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('channel._id');
					expect(res.body).to.have.nested.property('channel.name', cfchannel.name);
					expect(res.body).to.have.nested.property('channel.t', 'c');
					expect(res.body).to.have.nested.property('channel.customFields.field2', 'value2');
					expect(res.body).to.have.nested.property('channel.customFields.field3', 'value3');
					expect(res.body).to.have.nested.property('channel.customFields.field4', 'value4');
				})
				.end(done);
		});
		it('set customFields as a string -> should return 400', (done) => {
			const customFields = '';

			request.post(api('channels.setCustomFields'))
				.set(credentials)
				.send({
					roomName: cfchannel.name,
					customFields,
				})
				.expect('Content-Type', 'application/json')
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
				})
				.end(done);
		});
		it('delete channel with empty customFields', (done) => {
			request.post(api('channels.delete'))
				.set(credentials)
				.send({
					roomName: cfchannel.name,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
	});

	it('/channels.setJoinCode', async() => {
		const roomInfo = await getRoomInfo(channel._id);

		return request.post(api('channels.setJoinCode'))
			.set(credentials)
			.send({
				roomId: channel._id,
				joinCode: '123',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('channel._id');
				expect(res.body).to.have.nested.property('channel.name', `EDITED${ apiPublicChannelName }`);
				expect(res.body).to.have.nested.property('channel.t', 'c');
				expect(res.body).to.have.nested.property('channel.msgs', roomInfo.channel.msgs);
			});
	});

	it('/channels.setReadOnly', async() => {
		const roomInfo = await getRoomInfo(channel._id);

		return request.post(api('channels.setReadOnly'))
			.set(credentials)
			.send({
				roomId: channel._id,
				readOnly: true,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('channel._id');
				expect(res.body).to.have.nested.property('channel.name', `EDITED${ apiPublicChannelName }`);
				expect(res.body).to.have.nested.property('channel.t', 'c');
				expect(res.body).to.have.nested.property('channel.msgs', roomInfo.channel.msgs);
				expect(res.body).to.have.nested.property('channel.ro', !roomInfo.channel.ro);
			});
	});

	it('/channels.setFilesHidden', async() => {
		const roomInfo = await getRoomInfo(channel._id);

		return request.post(api('channels.setFilesHidden'))
			.set(credentials)
			.send({
				roomId: channel._id,
				filesHidden: true,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('channel._id');
				expect(res.body).to.have.nested.property('channel.name', `EDITED${ apiPublicChannelName }`);
				expect(res.body).to.have.nested.property('channel.t', 'c');
				expect(res.body).to.have.nested.property('channel.msgs', roomInfo.channel.msgs);
				expect(res.body).to.have.nested.property('channel.filesHidden', !roomInfo.channel.filesHidden);
			});
	});

	it('/channels.setDefault', async() => {
		const roomInfo = await getRoomInfo(channel._id);

		return request.post(api('channels.setDefault'))
			.set(credentials)
			.send({
				roomId: channel._id,
				default: true,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('channel._id');
				expect(res.body).to.have.nested.property('channel.name', `EDITED${ apiPublicChannelName }`);
				expect(res.body).to.have.nested.property('channel.t', 'c');
				expect(res.body).to.have.nested.property('channel.msgs', roomInfo.channel.msgs);
			});
	});

	it('/channels.leave', async() => {
		const roomInfo = await getRoomInfo(channel._id);

		return request.post(api('channels.leave'))
			.set(credentials)
			.send({
				roomId: channel._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('channel._id');
				expect(res.body).to.have.nested.property('channel.name', `EDITED${ apiPublicChannelName }`);
				expect(res.body).to.have.nested.property('channel.t', 'c');
				expect(res.body).to.have.nested.property('channel.msgs', roomInfo.channel.msgs + 1);
			});
	});

	it('/channels.setType', async() => {
		const roomInfo = await getRoomInfo(channel._id);

		return request.post(api('channels.setType'))
			.set(credentials)
			.send({
				roomId: channel._id,
				type: 'p',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('channel._id');
				expect(res.body).to.have.nested.property('channel.name', `EDITED${ apiPublicChannelName }`);
				expect(res.body).to.have.nested.property('channel.t', 'p');
				expect(res.body).to.have.nested.property('channel.msgs', roomInfo.channel.msgs + 1);
			});
	});

	describe('/channels.delete:', () => {
		let testChannel;
		it('/channels.create', (done) => {
			request.post(api('channels.create'))
				.set(credentials)
				.send({
					name: `channel.test.${ Date.now() }`,
				})
				.end((err, res) => {
					testChannel = res.body.channel;
					done();
				});
		});
		it('/channels.delete', (done) => {
			request.post(api('channels.delete'))
				.set(credentials)
				.send({
					roomName: testChannel.name,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		it('/channels.info', (done) => {
			request.get(api('channels.info'))
				.set(credentials)
				.query({
					roomId: testChannel._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('errorType', 'error-room-not-found');
				})
				.end(done);
		});
	});

	describe('/channels.deleteMany:', () => {
		let testChannel1;
		let testChannel2;
		it('/channels.create - 1', (done) => {
			request.post(api('channels.create'))
				.set(credentials)
				.send({
					name: `channel.test.${ Date.now() }`,
				})
				.end((err, res) => {
					testChannel1 = res.body.channel;
					done();
				});
		});
		it('/channels.create - 2', (done) => {
			request.post(api('channels.create'))
				.set(credentials)
				.send({
					name: `channel.test.${ Date.now() }`,
				})
				.end((err, res) => {
					testChannel2 = res.body.channel;
					done();
				});
		});
		it('/channels.deleteMany', (done) => {
			request.post(api('channels.deleteMany'))
				.set(credentials)
				.send({
					channels: [
						{ roomName: testChannel1.name },
						{ roomId: testChannel2._id },
					],
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		it('/channels.info - 1', (done) => {
			request.get(api('channels.info'))
				.set(credentials)
				.query({
					roomId: testChannel1._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('errorType', 'error-room-not-found');
				})
				.end(done);
		});
		it('/channels.info - 2', (done) => {
			request.get(api('channels.info'))
				.set(credentials)
				.query({
					roomId: testChannel2._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(400)
				.expect((res) => {
					expect(res.body).to.have.property('success', false);
					expect(res.body).to.have.property('errorType', 'error-room-not-found');
				})
				.end(done);
		});
	});

	describe('/channels.getAllUserMentionsByChannel', () => {
		it('should return and array of mentions by channel', (done) => {
			request.get(api('channels.getAllUserMentionsByChannel'))
				.set(credentials)
				.query({
					roomId: channel._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('mentions').and.to.be.an('array');
					expect(res.body).to.have.property('count');
					expect(res.body).to.have.property('offset');
					expect(res.body).to.have.property('total');
				})
				.end(done);
		});
	});

	describe('/channels.roles', () => {
		let testChannel;
		it('/channels.create', (done) => {
			request.post(api('channels.create'))
				.set(credentials)
				.send({
					name: `channel.roles.test.${ Date.now() }`,
				})
				.end((err, res) => {
					testChannel = res.body.channel;
					done();
				});
		});
		it('/channels.invite', (done) => {
			request.post(api('channels.invite'))
				.set(credentials)
				.send({
					roomId: testChannel._id,
					userId: 'rocket.cat',
				})
				.end(done);
		});
		it('/channels.addModerator', (done) => {
			request.post(api('channels.addModerator'))
				.set(credentials)
				.send({
					roomId: testChannel._id,
					userId: 'rocket.cat',
				})
				.end(done);
		});
		it('/channels.addLeader', (done) => {
			request.post(api('channels.addLeader'))
				.set(credentials)
				.send({
					roomId: testChannel._id,
					userId: 'rocket.cat',
				})
				.end(done);
		});
		it('should return an array of role <-> user relationships in a channel', (done) => {
			request.get(api('channels.roles'))
				.set(credentials)
				.query({
					roomId: testChannel._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('roles').that.is.an('array').that.has.lengthOf(2);

					expect(res.body.roles[0]).to.have.a.property('_id').that.is.a('string');
					expect(res.body.roles[0]).to.have.a.property('rid').that.is.equal(testChannel._id);
					expect(res.body.roles[0]).to.have.a.property('roles').that.is.an('array').that.includes('moderator', 'leader');
					expect(res.body.roles[0]).to.have.a.property('u').that.is.an('object');
					expect(res.body.roles[0].u).to.have.a.property('_id').that.is.a('string');
					expect(res.body.roles[0].u).to.have.a.property('username').that.is.a('string');

					expect(res.body.roles[1]).to.have.a.property('_id').that.is.a('string');
					expect(res.body.roles[1]).to.have.a.property('rid').that.is.equal(testChannel._id);
					expect(res.body.roles[1]).to.have.a.property('roles').that.is.an('array').that.includes('owner');
					expect(res.body.roles[1]).to.have.a.property('u').that.is.an('object');
					expect(res.body.roles[1].u).to.have.a.property('_id').that.is.a('string');
					expect(res.body.roles[1].u).to.have.a.property('username').that.is.a('string');
				})
				.end(done);
		});
	});

	describe('/channels.moderators', () => {
		let testChannel;
		it('/channels.create', (done) => {
			request.post(api('channels.create'))
				.set(credentials)
				.send({
					name: `channel.roles.test.${ Date.now() }`,
				})
				.end((err, res) => {
					testChannel = res.body.channel;
					done();
				});
		});
		it('/channels.invite', (done) => {
			request.post(api('channels.invite'))
				.set(credentials)
				.send({
					roomId: testChannel._id,
					userId: 'rocket.cat',
				})
				.end(done);
		});
		it('/channels.addModerator', (done) => {
			request.post(api('channels.addModerator'))
				.set(credentials)
				.send({
					roomId: testChannel._id,
					userId: 'rocket.cat',
				})
				.end(done);
		});
		it('should return an array of moderators with rocket.cat as a moderator', (done) => {
			request.get(api('channels.moderators'))
				.set(credentials)
				.query({
					roomId: testChannel._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('moderators').that.is.an('array').that.has.lengthOf(1);
					expect(res.body.moderators[0].username).to.be.equal('rocket.cat');
				})
				.end(done);
		});
	});
});
