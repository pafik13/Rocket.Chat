import { check } from 'meteor/check';
import { UploadFS } from 'meteor/jalik:ufs';
import { Random } from 'meteor/random';
import _ from 'underscore';
import S3 from 'aws-sdk/clients/s3';
import CloudFront from 'aws-sdk/clients/cloudfront';
import stream from 'stream';

/**
 * AmazonS3 store
 * @param options
 * @constructor
 */
export class AmazonS3Store extends UploadFS.Store {

	constructor(options) {
		// Default options
		// options.secretAccessKey,
		// options.accessKeyId,
		// options.region,
		// options.sslEnabled // optional

		options = _.extend({
			httpOptions: {
				timeout: 6000,
				agent: false,
			},
		}, options);

		super(options);

		// 		console.log('AmazonS3Store:CloudFront.Signer', typeof CloudFront.Signer);
		console.log('AmazonS3Store:options', options.CDN);

		const classOptions = options;

		const s3 = new S3(options.connection);
		let cloudFront;
		if (options.CDN) {
			const { accessKeyId, privateKey } = options.CDN;
			cloudFront = new CloudFront.Signer(accessKeyId, privateKey);
		}

		options.getPath = options.getPath || function(file) {
			return file._id;
		};

		this.getPath = function(file) {
			if (file.AmazonS3) {
				return file.AmazonS3.path;
			}
			// Compatibility
			// TODO: Migration
			if (file.s3) {
				return file.s3.path + file._id;
			}
		};

		this.getRedirectURL = function(file, canUseCDN = true) {
			let url;
			const fileKey = this.getPath(file);

			if (cloudFront && canUseCDN) {
				const params = {
					url: options.CDN.domain + fileKey,
					expires: Math.floor((new Date()).getTime() / 1000) + classOptions.URLExpiryTimeSpan,
				};
				url = cloudFront.getSignedUrl(params);
				console.log('AmazonS3Store:getRedirectURL:url', params.url);
				console.log('AmazonS3Store:getRedirectURL:getSignedUrl', url);
			} else {
				const params = {
					Key: fileKey,
					Expires: classOptions.URLExpiryTimeSpan,
				};
				url = s3.getSignedUrl('getObject', params);
			}

			return url;
		};

		/**
		 * Creates the file in the collection
		 * @param file
		 * @param callback
		 * @return {string}
		 */
		this.create = function(file, callback) {
			check(file, Object);

			if (file._id == null) {
				file._id = Random.id();
			}

			file.AmazonS3 = {
				path: this.options.getPath(file),
			};

			file.store = this.options.name; // assign store to file
			return this.getCollection().insert(file, callback);
		};

		/**
		 * Removes the file
		 * @param fileId
		 * @param callback
		 */
		this.delete = function(fileId, callback) {
			const file = this.getCollection().findOne({ _id: fileId });
			const params = {
				Key: this.getPath(file),
			};

			s3.deleteObject(params, (err, data) => {
				if (err) {
					console.error(err);
				}

				callback && callback(err, data);
			});
		};

		/**
		 * Returns the file read stream
		 * @param fileId
		 * @param file
		 * @param options
		 * @return {*}
		 */
		this.getReadStream = function(fileId, file, options = {}) {
			const params = {
				Key: this.getPath(file),
			};

			if (options.start && options.end) {
				params.Range = `${ options.start } - ${ options.end }`;
			}

			return s3.getObject(params).createReadStream();
		};

		/**
		 * Returns the file write stream
		 * @param fileId
		 * @param file
		 * @param options
		 * @return {*}
		 */
		this.getWriteStream = function(fileId, file/* , options*/) {
			const writeStream = new stream.PassThrough();
			writeStream.length = file.size;

			writeStream.on('newListener', (event, listener) => {
				if (event === 'finish') {
					process.nextTick(() => {
						writeStream.removeListener(event, listener);
						writeStream.on('real_finish', listener);
					});
				}
			});

			s3.putObject({
				Key: this.getPath(file),
				Body: writeStream,
				ContentType: file.type,
				ContentDisposition: `inline; filename="${ encodeURI(file.name) }"`,

			}, (error) => {
				if (error) {
					console.error(error);
				}

				writeStream.emit('real_finish');
			});

			return writeStream;
		};
	}
}

// Add store to UFS namespace
UploadFS.store.AmazonS3 = AmazonS3Store;
