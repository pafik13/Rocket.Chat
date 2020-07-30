Package.describe({
	name: 'rocketchat:p2p-calls',
	version: '0.0.1',
	summary: 'Rocketchat Peer To Peer Calls',
	git: '',
});

Package.onUse(function(api) {
	api.use([
		'ecmascript',
		'tap:i18n',
		'rocketchat:models',
		'rocketchat:notifications',
	]);
	api.mainModule('server/index.js', 'server');
});
