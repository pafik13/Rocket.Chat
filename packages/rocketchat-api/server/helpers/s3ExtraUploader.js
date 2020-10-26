import { API } from '../api';
import { Meteor } from 'meteor/meteor';
import S3 from 'aws-sdk/clients/s3';
import { settings } from 'meteor/rocketchat:settings';
import Path from 'path';
import { Random } from 'meteor/random';

API.helperMethods.set('s3RoomAvatarPhotoUploadClient', function _s3RoomAvatarPhotoUploadClient(roomId, userId, file, options) {
	if (!roomId || !userId || !file) {
		throw new Meteor.Error('s3AvatarPhotoUploadClient', 'The fields "userId" or "roomId" or "file" is can\'t be empty');
	}

	const s3options = Object.assign({
		secretAccessKey: settings.get('FileUpload_S3_AWSSecretAccessKey'),
		accessKeyId: settings.get('FileUpload_S3_AWSAccessKeyId'),
		region: settings.get('FileUpload_S3_RegionExtra') || settings.get('FileUpload_S3_Region'),
		endpoint: settings.get('FileUpload_S3_BucketURL'),
		signatureVersion: settings.get('FileUpload_S3_SignatureVersion') || 'v4',
		s3ForcePathStyle: settings.get('FileUpload_S3_ForcePathStyle') || false,
		sslEnabled: true,
	}, options);

	if (!s3options.endpoint) { delete s3options.endpoint; }

	const s3 = new S3(s3options);
	const { filename, mimetype } = file;
	const filenameInBase64 = Buffer.from(filename).toString('base64');
	const mimetypeInBase64 = Buffer.from(mimetype).toString('base64');
	const prefix = 'images/rocket_room_avatars';
	const key = `${ prefix }/${ roomId }/${ Random.id() }${ Path.extname(filename) }`;
	const params = {
		Body: file.fileBuffer,
		Bucket: settings.get('FileUpload_S3_BucketExtra') || settings.get('FileUpload_S3_Bucket'),
		Key: key,
		Tagging: `rid=${ roomId }&userId=${ userId }&filenameInBase64=${ filenameInBase64 }&mimetypeInBase64=${ mimetypeInBase64 }`,
		ACL: 'public-read',
	};

	const photoUrl = (s3options.endpoint) ? `${ s3options.endpoint }/${ params.Bucket }/${ params.Key }` : `https://s3.${ s3options.region }.amazonaws.com/${ params.Bucket }/${ params.Key }`;

	return { s3, params, photoUrl };
});
