import { check } from 'meteor/check';

export const stringToBoolean = function(string, defaultWhenUndefined = false) {
	if (typeof string === 'undefined') { return defaultWhenUndefined; }

	check(string, String);

	// https://stackoverflow.com/a/1414175
	switch (string.trim().toLowerCase()) {
		case 'false':
		case 'no':
		case 'f':
		case '0':
		case '':
			return false;
		default:
			return true;
	}
};

