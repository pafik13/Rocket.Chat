import { Uploads } from 'meteor/rocketchat:models';
import { API } from '../api';

API.helperMethods.set('addPreviewToFile', function _addUserToObject(file) {
	if (file.identify && file.identify.preview) {
		if (file.identify.preview._id) {
			file.video_preview = Uploads.findOne({ _id: file.identify.preview._id });
		} else {
			file.video_preview = Uploads.findOne({ name: `${ file.id }-preview.png` });
		}
	}

	return file;
});

