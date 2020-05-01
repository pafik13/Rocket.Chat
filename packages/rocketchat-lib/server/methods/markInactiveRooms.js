import { Meteor } from 'meteor/meteor';
import { settings } from 'meteor/rocketchat:settings';
import { Rooms } from 'meteor/rocketchat:models';

Meteor.methods({
	markInactiveRooms() {
		const maxDaysWithoutMessage = settings.get('Rooms_Max_Days_For_Inactive');
		const maxRoomForMarkAsInactive = settings.get('Rooms_Max_For_Mark_As_Inactive');

		if (maxDaysWithoutMessage && maxRoomForMarkAsInactive) {
			return Rooms.markAsInactive(maxDaysWithoutMessage, maxRoomForMarkAsInactive);
		}

		return 0;
	},
});
