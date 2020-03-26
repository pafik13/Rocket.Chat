import { FlowRouter } from 'meteor/kadira:flow-router' ;
import { BlazeLayout } from 'meteor/kadira:blaze-layout';

FlowRouter.route('/admin/users', {
	name: 'admin-users',
	action() {
		BlazeLayout.render('main', { center: 'adminUsers' });
	},
});

FlowRouter.route('/admin/subscriptions', {
	name: 'admin-subscriptions',
	action() {
		BlazeLayout.render('main', { center: 'adminSubscriptions' });
	},
});

FlowRouter.route('/admin/rooms', {
	name: 'admin-rooms',
	action() {
		BlazeLayout.render('main', { center: 'adminRooms' });
	},
});

FlowRouter.route('/admin/complaints', {
	name: 'admin-complaints',
	action() {
		BlazeLayout.render('main', { center: 'adminComplaints' });
	},
});

FlowRouter.route('/admin/blacklistedRooms', {
	name: 'admin-blacklistedRooms',
	action() {
		BlazeLayout.render('main', { center: 'adminBlacklistedRooms' });
	},
});

FlowRouter.route('/admin/info', {
	name: 'admin-info',
	action() {
		BlazeLayout.render('main', { center: 'adminInfo' });
	},
});

FlowRouter.route('/admin/import', {
	name: 'admin-import',
	action() {
		BlazeLayout.render('main', { center: 'adminImport' });
	},
});

FlowRouter.route('/admin/import/history', {
	name: 'admin-import-history',
	action() {
		BlazeLayout.render('main', { center: 'adminImportHistory' });
	},
});

FlowRouter.route('/admin/import/prepare/:importer', {
	name: 'admin-import-prepare',
	action() {
		BlazeLayout.render('main', { center: 'adminImportPrepare' });
	},
});

FlowRouter.route('/admin/import/progress/:importer', {
	name: 'admin-import-progress',
	action() {
		BlazeLayout.render('main', { center: 'adminImportProgress' });
	},
});

FlowRouter.route('/admin/:group?', {
	name: 'admin',
	action() {
		BlazeLayout.render('main', { center: 'admin' });
	},
});
