Package.describe({
	name: 'rocketchat:ui-utils',
	version: '0.0.1',
	summary: 'Rocketchat Ui Utils',
	git: '',
	documentation: 'README.md',
});

Package.onUse(function(api) {
	api.use([
		'ecmascript',
		'templating',
		'kadira:flow-router',
		'kadira:blaze-layout',
		'rocketchat:utils',
		'rocketchat:promises',
		'rocketchat:notifications',
		'rocketchat:authorization',
		'rocketchat:streamer',
		'rocketchat:models',
		'rocketchat:lazy-load',
	]);
	api.mainModule('client/index.js', 'client');
});
