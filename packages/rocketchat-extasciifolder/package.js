Package.describe({
	name: 'rocketchat:extasciifolder',
	version: '0.0.1',
	summary: 'Extended ASCII folding',
	git: '',
});

Package.onUse(function(api) {
	api.use([
		'ecmascript',
	]);
	api.mainModule('server/index.js', 'server');
});
