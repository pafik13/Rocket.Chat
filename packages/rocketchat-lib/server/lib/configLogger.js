import { Meteor } from 'meteor/meteor';
import { LoggerManager, StdOut } from 'meteor/rocketchat:logger';
import { settings } from 'meteor/rocketchat:settings';

settings.get('Log_Package', function(key, value) {
	return LoggerManager.showPackage = value;
});

settings.get('Log_File', function(key, value) {
	return LoggerManager.showFileAndLine = value;
});

settings.get('Log_Level', function(key, value) {
	if (value != null) {
		LoggerManager.logLevel = parseInt(value);
		Meteor.setTimeout(() => LoggerManager.enable(true), 200);
	}
});

settings.get('Log_View_Limit', function(key, value) {
	if (value != null) {
		StdOut.limit = parseInt(value);
		Meteor.setTimeout(() => StdOut.trim(), 200);
	}
});
