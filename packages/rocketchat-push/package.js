Package.describe({
	name: 'rocketchat:push',
	version: '4.0.0',
	summary: 'Push notifications for APN and GCM',
});

Package.onUse(function(api) {
	api.use([
		'ecmascript',
		'rocketchat:logger',
	]);
	api.mainModule('server/index.js', 'server');
});
