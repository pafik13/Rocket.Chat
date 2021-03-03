Package.describe({
	name: 'rocketchat:lib',
	version: '0.0.1',
	summary: 'RocketChat libraries',
	git: '',
});

Package.onUse(function(api) {
	api.use([
		'ecmascript',
		'templating',
		'rate-limit',
		'kadira:flow-router',
		'kadira:blaze-layout',
		'webapp',
		'session',
		'reactive-var',
		'reactive-dict',
		'accounts-base',
		'random',
		'check',
		'tracker',
		'ddp-rate-limiter',
		'mongo',
		'mizzao:timesync',
		'konecty:multiple-instances-status',
		'matb33:collection-hooks',
		'service-configuration',
		'rocketchat:utils',
		'rocketchat:models',
		'rocketchat:migrations',
		'rocketchat:metrics',
		'rocketchat:callbacks',
		'rocketchat:notifications',
		'rocketchat:promises',
		'rocketchat:ui-utils',
		'rocketchat:tooltip',
		'rocketchat:ui',
		'rocketchat:i18n',
		'rocketchat:settings',
		'rocketchat:authorization',
		'rocketchat:file',
		'rocketchat:file-upload',
		'rocketchat:push-notifications',
		'rocketchat:assets',
		'rocketchat:markdown',
		'rocketchat:channel-settings',
		'rocketchat:streamer',
		'rocketchat:extasciifolder',
	]);
	api.imply('tap:i18n');

	api.mainModule('server/index.js', 'server');
	api.mainModule('client/index.js', 'client');
});
