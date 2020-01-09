Package.describe({
	name: 'rocketchat:i18n',
	version: '0.0.1',
	summary: 'RocketChat i18n',
	git: '',
});

Package.onUse(function(api) {
	api.use('templating', 'client');
	api.use('tap:i18n@1.8.2');
});
