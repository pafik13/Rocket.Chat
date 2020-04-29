import { settings } from 'meteor/rocketchat:settings';
import _ from 'underscore';

export const spotlightRoomsBlackList = function() {
	const spotlightBlackList = settings.get('Search_RoomsBlackList');

	if (!spotlightBlackList) {
		return;
	}
	return _.map(spotlightBlackList.split(','), function(item) {
		return item.trim().toLowerCase();
	});
};

export const spotlightRoomsIsValidText = function(text) {
	const list = spotlightRoomsBlackList();
	if (!list) {
		return true;
	}

	if (!Array.isArray(list)) {
		return true;
	}

	if (!text) {
		return false;
	}

	const testText = text.toLowerCase();
	for (let l = 0, len = list.length, item; l < len; l++) {
		item = list[l];
		if (testText.includes(item)) {
			return false;
		}
	}

	return true;
};
