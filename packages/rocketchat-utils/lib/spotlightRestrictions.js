import { settings } from 'meteor/rocketchat:settings';
import _ from 'underscore';

export const spotlightRoomsBlackList = function() {
	const spotlightBlackList = settings.get('Search_RoomsBlackList');

	if (!spotlightBlackList) {
		return;
	}
	return _.map(spotlightBlackList.split(','), function(item) {
		return item.trim();
	});
};

export const spotlightRoomsIsValidText = function(text) {
	const list = spotlightRoomsBlackList();
	if (!list) {
		return true;
	}

	if (!text) {
		return false;
	}

	return !_.contains(list, text);
};
