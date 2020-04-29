// hyphenate and escape adapted from Facebook's React under Apache 2 license
import { check } from 'meteor/check';

export const hyphenate = function hyphenate(str) {
	check(str, String);
	const uppercase = /([A-ZА-Я])/g;
	return str.replace(uppercase, '-$1').toLowerCase();
};
