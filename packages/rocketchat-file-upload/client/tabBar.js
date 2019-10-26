import { Meteor } from 'meteor/meteor';
import { TabBar } from 'meteor/rocketchat:ui-utils';

Meteor.startup(function() {
	TabBar.addButton({
		groups: ['channel', 'group', 'direct'],
		id: 'files-preferences',
		i18nTitle: 'Files_Preferences',
		icon: 'download',
		template: 'filesPreferencesFlexTab',
		order: 110,
	});
});
