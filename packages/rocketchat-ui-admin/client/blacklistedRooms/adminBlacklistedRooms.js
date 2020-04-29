import { Tracker } from 'meteor/tracker';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { TAPi18n } from 'meteor/tap:i18n';
import { SideNav, RocketChatTabBar, TabBar } from 'meteor/rocketchat:ui-utils';
import { t, roomTypes } from 'meteor/rocketchat:utils';
import { hasAllPermission } from 'meteor/rocketchat:authorization';
import { ChannelSettings } from 'meteor/rocketchat:channel-settings';
import _ from 'underscore';
import { AdminChatRoom } from '../rooms/adminRooms';

Template.adminBlacklistedRooms.helpers({
	isReady() {
		const instance = Template.instance();
		return instance.ready && instance.ready.get();
	},
	blacklistedRooms() {
		return Template.instance().blacklistedRooms();
	},
	isLoading() {
		const instance = Template.instance();
		if (!(instance.ready && instance.ready.get())) {
			return 'btn-loading';
		}
	},
	hasMore() {
		const instance = Template.instance();
		if (instance.limit && instance.limit.get() && instance.blacklistedRooms() && instance.blacklistedRooms().count()) {
			return instance.limit.get() === instance.blacklistedRooms().length;
		}
	},
	blacklistedRoomsCount() {
		const blacklistedRooms = Template.instance().blacklistedRooms();
		return blacklistedRooms && blacklistedRooms.count();
	},
	type() {
		return TAPi18n.__(roomTypes.roomTypes[this.t].label);
	},
	'default'() {
		if (this.default) {
			return t('True');
		} else {
			return t('False');
		}
	},
	flexData() {
		return {
			tabBar: Template.instance().tabBar,
			data: Template.instance().tabBarData.get(),
		};
	},
	onTableScroll() {
		const instance = Template.instance();
		return function(currentTarget) {
			if (
				currentTarget.offsetHeight + currentTarget.scrollTop >=
				currentTarget.scrollHeight - 100
			) {
				return instance.limit.set(instance.limit.get() + 50);
			}
		};
	},
	onTableItemClick() {
		const instance = Template.instance();
		return function(item) {
			instance.tabBarData.set(undefined);
			Session.set('adminRoomsSelected', {
				rid: item._id,
			});
			return instance.tabBar.open('admin-room');
		};
	},

});

Template.adminBlacklistedRooms.onCreated(function() {
	const instance = this;
	this.limit = new ReactiveVar(50);
	this.types = new ReactiveVar([]);

	this.ready = new ReactiveVar(true);
	this.tabBar = new RocketChatTabBar();
	this.tabBar.showGroup(FlowRouter.current().route.name);
	this.tabBarData = new ReactiveVar();
	TabBar.addButton({
		groups: ['admin-blacklistedRooms'],
		id: 'admin-room',
		i18nTitle: 'Room_Info',
		icon: 'info-circled',
		template: 'adminRoomInfo',
		order: 1,
	});
	ChannelSettings.addOption({
		group: ['admin-room'],
		id: 'make-default',
		template: 'channelSettingsDefault',
		data() {
			return Session.get('blacklistedRoomsSelected');
		},
		validation() {
			return hasAllPermission('view-room-administration');
		},
	});
	this.autorun(function() {
		let types = instance.types.get();
		if (types.length === 0) {
			types = ['c', 'p'];
		}
		const limit = instance.limit.get();
		const subscription = instance.subscribe('adminBlacklistedRooms', types, limit);
		instance.ready.set(subscription.ready());
	});
	this.blacklistedRooms = function() {
		const limit = instance.limit && instance.limit.get();
		const blacklistedRooms = AdminChatRoom.find({ blacklisted: true }, { limit, sort: { ts: -1 } });
		return blacklistedRooms;
	};
	this.getSearchTypes = function() {
		return _.map($('[name=room-type]:checked'), function(input) {
			return $(input).val();
		});
	};
});

Template.adminBlacklistedRooms.onRendered(function() {
	Tracker.afterFlush(function() {
		SideNav.setFlex('adminFlex');
		SideNav.openFlex();
	});
});

Template.adminBlacklistedRooms.events({
	'change [name=room-type]'(e, t) {
		t.types.set(t.getSearchTypes());
	},
});
