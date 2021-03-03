import { expect } from 'chai';

import { getCredentials, api, request, credentials } from '../../data/api-data.js';

describe('[Settings]', function() {
	this.retries(0);

	before((done) => getCredentials(done));

	describe('[/settings.public]', () => {
		it('should return public settings', (done) => {
			request.get(api('settings.public'))
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('settings');
					expect(res.body).to.have.property('count');
				})
				.end(done);
		});
	});

	describe('[/settings]', () => {
		it('should return private settings', (done) => {
			request.get(api('settings'))
				.set(credentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('settings');
					expect(res.body).to.have.property('count');
				})
				.end(done);
		});
	});

	describe('[/settings/:_id]', () => {
		it('should return one setting', (done) => {
			request.get(api('settings/Site_Url'))
				.set(credentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('_id', 'Site_Url');
					expect(res.body).to.have.property('value');
				})
				.end(done);
		});
	});

	describe('[/service.configurations]', () => {
		it('should return service configurations', (done) => {
			request.get(api('service.configurations'))
				.set(credentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('configurations');
				})
				.end(done);
		});
	});

	describe('[/settings/Use_elastic]', () => {
		it('should set Use_elastic', (done) => {
			request.post(api('settings/Use_elastic'))
				.set(credentials)
				.send({
					value: true,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('should get Use_elastic', (done) => {
			request.get(api('settings/Use_elastic'))
				.set(credentials)
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
					expect(res.body).to.have.property('_id', 'Use_elastic');
					expect(res.body).to.have.property('value', true);
				})
				.end(done);
		});
	});

	describe('[/settings/FileUpload_S3]', () => {
		it('should set FileUpload_S3_Bucket', (done) => {
			request.post(api('settings/FileUpload_S3_Bucket'))
				.set(credentials)
				.send({
					value: 'r-chat-apianon',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('should set FileUpload_S3_Acl', (done) => {
			request.post(api('settings/FileUpload_S3_Acl'))
				.set(credentials)
				.send({
					value: 'private',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('should set FileUpload_S3_AWSAccessKeyId', (done) => {
			request.post(api('settings/FileUpload_S3_AWSAccessKeyId'))
				.set(credentials)
				.send({
					value: process.env.AWS_ACCESS_KEY_ID,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('should set FileUpload_S3_AWSSecretAccessKey', (done) => {
			request.post(api('settings/FileUpload_S3_AWSSecretAccessKey'))
				.set(credentials)
				.send({
					value: process.env.AWS_SECRET_ACCESS_KEY,
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});

		it('should set FileUpload_S3_Region', (done) => {
			request.post(api('settings/FileUpload_S3_Region'))
				.set(credentials)
				.send({
					value: 'us-east-1',
				})
				.expect('Content-Type', 'application/json')
				.expect(200)
				.expect((res) => {
					expect(res.body).to.have.property('success', true);
				})
				.end(done);
		});
	});
});
