import { Meteor } from 'meteor/meteor';
import { settings } from 'meteor/rocketchat:settings';
import { Users, Complaints } from 'meteor/rocketchat:models';

Meteor.methods({
	doDeactivationsDueToComplaints() {
		const countForAutoDeactivation = settings.get('Complaints_Count_For_Auto_Deactivation');
		const autoDeactivationPeriod = settings.get('Complaints_Auto_Deactivation_Period');

		const admins = Users.findUsersInRoles('admin').fetch();
		const admin = admins[0];
		if (!admin) { return; }

		if (countForAutoDeactivation) {
			const userIds = Complaints.getUserIds(countForAutoDeactivation);
			if (userIds.length) {
				let period;
				if (autoDeactivationPeriod) {
					period = autoDeactivationPeriod;
				} else {
					period = 32e6;
				}
				userIds.forEach((it) => {
					const user = Users.findOneById(it._id);
					if (user) {
						Meteor.runAsUser(admin._id, () => {
							Meteor.call('deactivateUserForPeriod', user._id, period, 'complaints');
						});
						Complaints.setUnactiveByUserId(user._id);
					}
				});
			}
		}
	},
});
