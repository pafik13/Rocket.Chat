import {
	getCredentials,
	api,
	request,
	credentials,
	apiUsername,
	apiEmail,
} from '../../data/api-data.js';
import { password } from '../../data/user.js';

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

		it('should create for usernames ', (done) => {
			request.get(api('admin.createDirectMessage'))
				.set(credentials)
				.query({
					usernames: [username1, 'rocket.cat'],
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.end(done);
		});

		it('should create for userIds ', (done) => {
			request.get(api('admin.createDirectMessage'))
				.set(credentials)
				.query({
					userIds: [userId1, userId2],
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.end(done);
		});
	});
});
