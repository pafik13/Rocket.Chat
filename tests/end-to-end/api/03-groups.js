import { getCredentials, api, request, credentials, group, apiPrivateChannelName } from '../../data/api-data.js';
import { adminUsername } from '../../data/user';

function getRoomInfo(roomId) {
	return new Promise((resolve/* , reject*/) => {
		request.get(api('groups.info'))
			.set(credentials)
			.query({
				roomId,
			})
			.end((err, req) => {
				resolve(req.body);
			});
	});
}

describe('[Groups]', function() {
	this.retries(0);

	before((done) => getCredentials(done));

	it('/groups.create', (done) => {
		request.post(api('groups.create'))
			.set(credentials)
			.send({
				name: apiPrivateChannelName,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('group._id');
				expect(res.body).to.have.nested.property('group.name', apiPrivateChannelName);
				expect(res.body).to.have.nested.property('group.t', 'p');
				expect(res.body).to.have.nested.property('group.msgs', 0);
				group._id = res.body.group._id;
			})
			.end(done);
	});

	describe('[/groups.info]', () => {
		let testGroup = {};
		let groupMessage = {};
		it('creating new group...', (done) => {
			request.post(api('groups.create'))
				.set(credentials)
				.send({
					name: apiPrivateChannelName,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					testGroup = res.body.group;
				})
				.end(done);
		});
		it('should return group basic structure', (done) => {
			request.get(api('groups.info'))
				.set(credentials)
				.query({
					roomId: testGroup._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('group._id');
					expect(res.body).to.have.nested.property('group.name', apiPrivateChannelName);
					expect(res.body).to.have.nested.property('group.t', 'p');
					expect(res.body).to.have.nested.property('group.msgs', 0);
				})
				.end(done);
		});
		it('sending a message...', (done) => {
			request.post(api('chat.sendMessage'))
				.set(credentials)
				.send({
					message: {
						text: 'Sample message',
						rid: testGroup._id,
					},
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					groupMessage = res.body.message;
				})
				.end(done);
		});
		it('REACTing with last message', (done) => {
			request.post(api('chat.react'))
				.set(credentials)
				.send({
					emoji: ':squid:',
					messageId: groupMessage._id,
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
					messageId: groupMessage._id,
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
					messageId: groupMessage._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		it('should return group structure with "lastMessage" object including pin, reaction and star(should be an array) infos', (done) => {
			request.get(api('groups.info'))
				.set(credentials)
				.query({
					roomId: testGroup._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('group').and.to.be.an('object');
					const { group } = res.body;
					expect(group).to.have.property('lastMessage').and.to.be.an('object');
					expect(group.lastMessage).to.have.property('reactions').and.to.be.an('object');
					expect(group.lastMessage).to.have.property('pinned').and.to.be.a('boolean');
					expect(group.lastMessage).to.have.property('pinnedAt').and.to.be.a('string');
					expect(group.lastMessage).to.have.property('pinnedBy').and.to.be.an('object');
					expect(group.lastMessage).to.have.property('starred').and.to.be.an('array');
				})
				.end(done);
		});
		it('should return all groups messages where the last message of array should have the "star" array with USERS star ONLY', (done) => {
			request.get(api('groups.messages'))
				.set(credentials)
				.query({
					roomId: testGroup._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('messages').and.to.be.an('array');
					const { messages } = res.body;
					const lastMessage = messages.filter((message) => message._id === groupMessage._id)[0];
					expect(lastMessage).to.have.property('starred').and.to.be.an('array');
					expect(lastMessage.starred[0]._id).to.be.equal(adminUsername);
				})
				.end(done);
		});
	});

	it('/groups.invite', async(done) => {
		const roomInfo = await getRoomInfo(group._id);

		request.post(api('groups.invite'))
			.set(credentials)
			.send({
				roomId: group._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('group._id');
				expect(res.body).to.have.nested.property('group.name', apiPrivateChannelName);
				expect(res.body).to.have.nested.property('group.t', 'p');
				expect(res.body).to.have.nested.property('group.msgs', roomInfo.group.msgs + 1);
			})
			.end(done);
	});

	it('/groups.addModerator', (done) => {
		request.post(api('groups.addModerator'))
			.set(credentials)
			.send({
				roomId: group._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/groups.removeModerator', (done) => {
		request.post(api('groups.removeModerator'))
			.set(credentials)
			.send({
				roomId: group._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/groups.addOwner', (done) => {
		request.post(api('groups.addOwner'))
			.set(credentials)
			.send({
				roomId: group._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/groups.removeOwner', (done) => {
		request.post(api('groups.removeOwner'))
			.set(credentials)
			.send({
				roomId: group._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/groups.addLeader', (done) => {
		request.post(api('groups.addLeader'))
			.set(credentials)
			.send({
				roomId: group._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.a.property('success', true);
			})
			.end(done);
	});

	it('/groups.removeLeader', (done) => {
		request.post(api('groups.removeLeader'))
			.set(credentials)
			.send({
				roomId: group._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/groups.kick', (done) => {
		request.post(api('groups.kick'))
			.set(credentials)
			.send({
				roomId: group._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/groups.invite', async(done) => {
		const roomInfo = await getRoomInfo(group._id);

		request.post(api('groups.invite'))
			.set(credentials)
			.send({
				roomId: group._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('group._id');
				expect(res.body).to.have.nested.property('group.name', apiPrivateChannelName);
				expect(res.body).to.have.nested.property('group.t', 'p');
				expect(res.body).to.have.nested.property('group.msgs', roomInfo.group.msgs + 1);
			})
			.end(done);
	});

	it('/groups.addOwner', (done) => {
		request.post(api('groups.addOwner'))
			.set(credentials)
			.send({
				roomId: group._id,
				userId: 'rocket.cat',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/groups.setDescription', (done) => {
		request.post(api('groups.setDescription'))
			.set(credentials)
			.send({
				roomId: group._id,
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

	it('/groups.setTopic', (done) => {
		request.post(api('groups.setTopic'))
			.set(credentials)
			.send({
				roomId: group._id,
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

	it('/groups.setPurpose', (done) => {
		request.post(api('groups.setPurpose'))
			.set(credentials)
			.send({
				roomId: group._id,
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

	it('/groups.history', (done) => {
		request.get(api('groups.history'))
			.set(credentials)
			.query({
				roomId: group._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.property('messages');
			})
			.end(done);
	});

	it('/groups.archive', (done) => {
		request.post(api('groups.archive'))
			.set(credentials)
			.send({
				roomId: group._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/groups.unarchive', (done) => {
		request.post(api('groups.unarchive'))
			.set(credentials)
			.send({
				roomId: group._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/groups.close', (done) => {
		request.post(api('groups.close'))
			.set(credentials)
			.send({
				roomId: group._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/groups.close', (done) => {
		request.post(api('groups.close'))
			.set(credentials)
			.send({
				roomName: apiPrivateChannelName,
			})
			.expect('Content-Type', 'application/json')
			.expect(400)
			.expect((res) => {
				expect(res.body).to.have.property('success', false);
				expect(res.body).to.have.property('error', `The private group, ${ apiPrivateChannelName }, is already closed to the sender`);
			})
			.end(done);
	});

	it('/groups.open', (done) => {
		request.post(api('groups.open'))
			.set(credentials)
			.send({
				roomId: group._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/groups.list', (done) => {
		request.get(api('groups.list'))
			.set(credentials)
			.query({
				roomId: group._id,
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

	it('/groups.counters', (done) => {
		request.get(api('groups.counters'))
			.set(credentials)
			.query({
				roomId: group._id,
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

	it('/groups.rename', async(done) => {
		const roomInfo = await getRoomInfo(group._id);

		request.post(api('groups.rename'))
			.set(credentials)
			.send({
				roomId: group._id,
				name: `EDITED${ apiPrivateChannelName }`,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('group._id');
				expect(res.body).to.have.nested.property('group.name', `EDITED${ apiPrivateChannelName }`);
				expect(res.body).to.have.nested.property('group.t', 'p');
				expect(res.body).to.have.nested.property('group.msgs', roomInfo.group.msgs + 1);
			})
			.end(done);
	});

	it('/groups.getIntegrations', (done) => {
		request.get(api('groups.getIntegrations'))
			.set(credentials)
			.query({
				roomId: group._id,
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

	it('/groups.setReadOnly', (done) => {
		request.post(api('groups.setReadOnly'))
			.set(credentials)
			.send({
				roomId: group._id,
				readOnly: true,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it.skip('/groups.leave', (done) => {
		request.post(api('groups.leave'))
			.set(credentials)
			.send({
				roomId: group._id,
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	it('/groups.setAnnouncement', (done) => {
		request.post(api('groups.setAnnouncement'))
			.set(credentials)
			.send({
				roomId: group._id,
				announcement: 'this is an announcement of a group for api tests',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
				expect(res.body).to.have.nested.property('announcement', 'this is an announcement of a group for api tests');
			})
			.end(done);
	});

	it('/groups.setType', (done) => {
		request.post(api('groups.setType'))
			.set(credentials)
			.send({
				roomId: group._id,
				type: 'c',
			})
			.expect('Content-Type', 'application/json')
			.expect(200)
			.expect((res) => {
				expect(res.body).to.have.property('success', true);
			})
			.end(done);
	});

	describe('/groups.setCustomFields:', () => {
		let cfchannel;
		it('create group with customFields', (done) => {
			const customFields = { field0:'value0' };
			request.post(api('groups.create'))
				.set(credentials)
				.send({
					name: `channel.cf.${ Date.now() }`,
					customFields,
				})
				.end((err, res) => {
					cfchannel = res.body.group;
					done();
				});
		});
		it('get customFields using groups.info', (done) => {
			request.get(api('groups.info'))
				.set(credentials)
				.query({
					roomId: cfchannel._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('group.customFields.field0', 'value0');
					expect(res.body).to.have.nested.property('group.customFields.anonym_id', -1);
					expect(res.body).to.have.nested.property('group.customFields.photoUrl', '');
					expect(res.body).to.have.nested.property('group.customFields.registeredAt', cfchannel.customFields.registeredAt);
				})
				.end(done);
		});
		it('change customFields', async(done) => {
			const customFields = { field9:'value9' };
			request.post(api('groups.setCustomFields'))
				.set(credentials)
				.send({
					roomId: cfchannel._id,
					customFields,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('group._id');
					expect(res.body).to.have.nested.property('group.name', cfchannel.name);
					expect(res.body).to.have.nested.property('group.t', 'p');
					expect(res.body).to.have.nested.property('group.customFields.field9', 'value9');
					expect(res.body).to.have.nested.property('group.customFields.field0', 'value0');
				})
				.end(done);
		});
		it('get customFields using groups.info', (done) => {
			request.get(api('groups.info'))
				.set(credentials)
				.query({
					roomId: cfchannel._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('group.customFields.field9', 'value9');
				})
				.end(done);
		});
		it('delete group with customFields', (done) => {
			request.post(api('groups.delete'))
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
		it('create group without customFields', (done) => {
			request.post(api('groups.create'))
				.set(credentials)
				.send({
					name: `channel.cf.${ Date.now() }`,
				})
				.end((err, res) => {
					cfchannel = res.body.group;
					done();
				});
		});
		it('set customFields with one nested field', async(done) => {
			const customFields = { field1:'value1' };
			request.post(api('groups.setCustomFields'))
				.set(credentials)
				.send({
					roomId: cfchannel._id,
					customFields,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('group._id');
					expect(res.body).to.have.nested.property('group.name', cfchannel.name);
					expect(res.body).to.have.nested.property('group.t', 'p');
					expect(res.body).to.have.nested.property('group.customFields.field1', 'value1');
				})
				.end(done);
		});
		it('set customFields with multiple nested fields', async(done) => {
			const customFields = { field2:'value2', field3:'value3', field4:'value4' };

			request.post(api('groups.setCustomFields'))
				.set(credentials)
				.send({
					roomName: cfchannel.name,
					customFields,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('group._id');
					expect(res.body).to.have.nested.property('group.name', cfchannel.name);
					expect(res.body).to.have.nested.property('group.t', 'p');
					expect(res.body).to.have.nested.property('group.customFields.field2', 'value2');
					expect(res.body).to.have.nested.property('group.customFields.field3', 'value3');
					expect(res.body).to.have.nested.property('group.customFields.field4', 'value4');
					expect(res.body).to.have.nested.property('group.customFields.field1', 'value1');
				})
				.end(done);
		});
		it('set customFields to empty object', async(done) => {
			const customFields = {};

			request.post(api('groups.setCustomFields'))
				.set(credentials)
				.send({
					roomName: cfchannel.name,
					customFields,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('group._id');
					expect(res.body).to.have.nested.property('group.name', cfchannel.name);
					expect(res.body).to.have.nested.property('group.t', 'p');
					expect(res.body).to.have.nested.property('group.customFields.field2', 'value2');
					expect(res.body).to.have.nested.property('group.customFields.field3', 'value3');
					expect(res.body).to.have.nested.property('group.customFields.field4', 'value4');
				})
				.end(done);
		});
		it('set customFields as a string -> should return 400', async(done) => {
			const customFields = '';

			request.post(api('groups.setCustomFields'))
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
		it('delete group with empty customFields', (done) => {
			request.post(api('groups.delete'))
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

	describe('/groups.delete', () => {
		let testGroup;
		it('/groups.create', (done) => {
			request.post(api('groups.create'))
				.set(credentials)
				.send({
					name: `group.test.${ Date.now() }`,
				})
				.end((err, res) => {
					testGroup = res.body.group;
					done();
				});
		});
		it('/groups.delete', (done) => {
			request.post(api('groups.delete'))
				.set(credentials)
				.send({
					roomName: testGroup.name,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
		it('/groups.info', (done) => {
			request.get(api('groups.info'))
				.set(credentials)
				.query({
					roomId: testGroup._id,
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

	describe('/groups.roles', () => {
		let testGroup;
		it('/groups.create', (done) => {
			request.post(api('groups.create'))
				.set(credentials)
				.send({
					name: `group.roles.test.${ Date.now() }`,
				})
				.end((err, res) => {
					testGroup = res.body.group;
					done();
				});
		});
		it('/groups.invite', async(done) => {
			request.post(api('groups.invite'))
				.set(credentials)
				.send({
					roomId: testGroup._id,
					userId: 'rocket.cat',
				})
				.end(done);
		});
		it('/groups.addModerator', (done) => {
			request.post(api('groups.addModerator'))
				.set(credentials)
				.send({
					roomId: testGroup._id,
					userId: 'rocket.cat',
				})
				.end(done);
		});
		it('/groups.addLeader', (done) => {
			request.post(api('groups.addLeader'))
				.set(credentials)
				.send({
					roomId: testGroup._id,
					userId: 'rocket.cat',
				})
				.end(done);
		});
		it('should return an array of roles <-> user relationships in a private group', (done) => {
			request.get(api('groups.roles'))
				.set(credentials)
				.query({
					roomId: testGroup._id,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.a.property('success', true);
					expect(res.body).to.have.a.property('roles').that.is.an('array').that.has.lengthOf(2);

					expect(res.body.roles[0]).to.have.a.property('_id').that.is.a('string');
					expect(res.body.roles[0]).to.have.a.property('rid').that.is.equal(testGroup._id);
					expect(res.body.roles[0]).to.have.a.property('roles').that.is.an('array').that.includes('moderator', 'leader');
					expect(res.body.roles[0]).to.have.a.property('u').that.is.an('object');
					expect(res.body.roles[0].u).to.have.a.property('_id').that.is.a('string');
					expect(res.body.roles[0].u).to.have.a.property('username').that.is.a('string');

					expect(res.body.roles[1]).to.have.a.property('_id').that.is.a('string');
					expect(res.body.roles[1]).to.have.a.property('rid').that.is.equal(testGroup._id);
					expect(res.body.roles[1]).to.have.a.property('roles').that.is.an('array').that.includes('owner');
					expect(res.body.roles[1]).to.have.a.property('u').that.is.an('object');
					expect(res.body.roles[1].u).to.have.a.property('_id').that.is.a('string');
					expect(res.body.roles[1].u).to.have.a.property('username').that.is.a('string');
				})
				.end(done);
		});
	});

	describe('/groups.moderators', () => {
		let testGroup;
		it('/groups.create', (done) => {
			request.post(api('groups.create'))
				.set(credentials)
				.send({
					name: `group.roles.test.${ Date.now() }`,
				})
				.end((err, res) => {
					testGroup = res.body.group;
					done();
				});
		});
		it('/groups.invite', async(done) => {
			request.post(api('groups.invite'))
				.set(credentials)
				.send({
					roomId: testGroup._id,
					userId: 'rocket.cat',
				})
				.end(done);
		});
		it('/groups.addModerator', (done) => {
			request.post(api('groups.addModerator'))
				.set(credentials)
				.send({
					roomId: testGroup._id,
					userId: 'rocket.cat',
				})
				.end(done);
		});
		it('should return an array of moderators with rocket.cat as a moderator', (done) => {
			request.get(api('groups.moderators'))
				.set(credentials)
				.query({
					roomId: testGroup._id,
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
