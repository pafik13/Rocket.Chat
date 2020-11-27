import { API } from '../api';
import { settings } from 'meteor/rocketchat:settings';
import { HEADER_COUTNRY_CODE, HEADER_NGINX_GEO_CODE } from 'meteor/rocketchat:utils';

const defaultCountry = settings.get('Rooms_Default_Country');

API.helperMethods.set('getCountry', function _getCountry() {
	const { headers } = this.request;

	console.log(headers);

	return headers[HEADER_COUTNRY_CODE.toLowerCase()] || headers[HEADER_NGINX_GEO_CODE.toLowerCase()] || defaultCountry;
});
