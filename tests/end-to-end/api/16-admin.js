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
		it('should return channel basic structure - admin.getRoomInfo', async(done) => {
			const testChannel = await getChannelInfo(apiPublicChannelName);

			request.get(api('admin.getRoomInfo'))
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
				})
				.end(done);
		});
		it('should return group basic structure - admin.getRoomInfo', async(done) => {
			const testGroup = await getGroupInfo(apiPrivateChannelName);

			request.get(api('admin.getRoomInfo'))
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
				})
				.end(done);
		});
	});

	describe('setCustomFieldsForRoom - channel', () => {
		let testChannel;
		it('/channels.invite', async(done) => {
			testChannel = await getChannelInfo(apiPublicChannelName);
			request.post(api('channels.invite'))
				.set(credentials)
				.send({
					roomId: testChannel._id,
					userId: 'rocket.cat',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.end(done);
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
		it('/groups.invite', async(done) => {
			testGroup = await getGroupInfo(apiPrivateChannelName);

			request.post(api('groups.invite'))
				.set(credentials)
				.send({
					roomId: testGroup._id,
					userId: 'rocket.cat',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.end(done);
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
		it('should set customFields.anonym_id to group', async(done) => {
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
		it('should return the channel and the group for anonym_id', (done) => {
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
	});
});
