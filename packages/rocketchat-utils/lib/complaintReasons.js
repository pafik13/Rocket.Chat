import { settings } from 'meteor/rocketchat:settings';
import _ from 'underscore';

export const complaintReasonsList = function() {

	const complaintReasonsList = settings.get('Complaint_Reasons_List');
	//   console.log('complaintReasonsList:', complaintReasonsList)

	if (!complaintReasonsList) {
		return [];
	}
	return _.map(complaintReasonsList.split(','), function(item) {
		return item.trim();
	});
};
