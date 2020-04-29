Package.describe({
	name: 'rocketchat:message-complain',
	version: '0.0.1',
	summary: 'Complain about the message',
});

Package.onUse(function(api) {
	api.use([
		'ecmascript',
		'rocketchat:logger',
		'rocketchat:models',
		'rocketchat:ui-utils',
		'rocketchat:utils',
		'templating',
	]);
	api.mainModule('client/index.js', 'client');
	api.mainModule('server/index.js', 'server');
});
