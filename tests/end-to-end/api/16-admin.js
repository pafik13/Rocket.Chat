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

describe('[Admin]', function() {
	this.retries(0);
	let testChannel = {};
	let testGroup = {};

	before((done) => getCredentials(done));

	describe('createDirectMessage', () => {
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
	});

	describe('getRoomInfo', () => {
		it('should return channel basic structure - channels.info', (done) => {
			request.get(api('channels.info'))
				.set(credentials)
				.query({
					roomName: apiPublicChannelName,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('channel._id');
					expect(res.body).to.have.nested.property('channel.name', apiPublicChannelName);
					expect(res.body).to.have.nested.property('channel.t', 'c');
					expect(res.body).to.have.nested.property('channel.msgs', 0);
					testChannel = res.body;
				})
				.end(done);
		});
		it('should return channel basic structure - admin.getRoomInfo', (done) => {
			request.get(api('admin.getRoomInfo'))
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
				})
				.end(done);
		});
		it('should return group basic structure - groups.info', (done) => {
			request.get(api('groups.info'))
				.set(credentials)
				.query({
					roomName: apiPrivateChannelName,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.nested.property('group._id');
					expect(res.body).to.have.nested.property('group.name', apiPrivateChannelName);
					expect(res.body).to.have.nested.property('group.t', 'p');
					expect(res.body).to.have.nested.property('group.msgs', 0);
					testGroup = res.body;
				})
				.end(done);
		});
		it('should return group basic structure - admin.getRoomInfo', (done) => {
			request.get(api('admin.getRoomInfo'))
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
				})
				.end(done);
		});
	});

	describe('setCustomFieldsForRoom', () => {
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
		it('should set customFields.anonym_id to group', (done) => {
			request.post(api('admin.getRoomInfo'))
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
		it('should return the channel and the group for anonym_id', (done) => {
			request.post(api('admin.getRoomsByAnonymId'))
				.set(credentials)
				.send({
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
	});
});
