import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
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
export const AdminComplaints = new Mongo.Collection('rocketchat_complaints');

const getTimeZoneOffset = function() {
	const offset = new Date().getTimezoneOffset();
	const absOffset = Math.abs(offset);
	return `${ offset < 0 ? '+' : '-' }${ (`00${ Math.floor(absOffset / 60) }`).slice(-2) }:${ (`00${ (absOffset % 60) }`).slice(-2) }`;
};

Template.adminComplaints.helpers({
	isReady() {
		const instance = Template.instance();
		return instance.ready && instance.ready.get();
	},
	complaints() {
		return Template.instance().complaints();
	},
	isLoading() {
		const instance = Template.instance();
		if (!(instance.ready && instance.ready.get())) {
			return 'btn-loading';
		}
	},
	hasMore() {
		const instance = Template.instance();
		if (instance.limit && instance.limit.get() && instance.complaints() && instance.complaints().count()) {
			return instance.limit.get() === instance.complaints().count();
		}
	},
	complaintsCount() {
		const complaints = Template.instance().complaints();
		return complaints && complaints.length;
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
			if (item.roomId) {
				instance.tabBarData.set(undefined);
				Session.set('adminRoomsSelected', {
					rid: item.roomId,
				});
				return instance.tabBar.open('admin-room');
			}
			if (item.userId) {
				//         Session.set('adminRoomsSelected', {
				//           rid: item.roomId,
				//         });
				instance.tabBarData.set(Meteor.users.findOne(item.userId));
				return instance.tabBar.open('admin-user-info');
			}
		};
	},

});

Template.adminComplaints.onCreated(function() {
	const instance = this;
	const defaultDate = new Date();
	this.limit = new ReactiveVar(50);
	this.types = new ReactiveVar([]);

	this.complaintsFromDate = new ReactiveVar('');
	this.complaintsFromTime = new ReactiveVar('');

	this.ready = new ReactiveVar(true);
	this.tabBar = new RocketChatTabBar();
	this.tabBar.showGroup(FlowRouter.current().route.name);
	this.tabBarData = new ReactiveVar();
	TabBar.addButton({
		groups: ['admin-complaints'],
		id: 'admin-room',
		i18nTitle: 'Room_Info',
		icon: 'info-circled',
		template: 'adminRoomInfo',
		order: 1,
	});
	TabBar.addButton({
		groups: ['admin-complaints'],
		id: 'admin-user-info',
		i18nTitle: 'User_Info',
		icon: 'user',
		template: 'adminUserInfo',
		order: 3,
	});
	ChannelSettings.addOption({
		group: ['admin-room'],
		id: 'make-default',
		template: 'channelSettingsDefault',
		data() {
			return Session.get('adminComplaintsSelected');
		},
		validation() {
			return hasAllPermission('view-room-administration');
		},
	});
	this.autorun(function() {
		const metaFromDate = instance.complaintsFromDate.get();
		const metaFromTime = instance.complaintsFromTime.get();
		let fromDate = defaultDate;

		if (metaFromDate) {
			fromDate = new Date(`${ metaFromDate }T${ metaFromTime || '00:00' }:00${ getTimeZoneOffset() }`);
		}

		let types = instance.types.get();
		if (types.length === 0) {
			types = ['r', 'u'];
		}
		const limit = instance.limit.get();
		const subscription = instance.subscribe('adminComplaints', types, fromDate, limit);
		instance.ready.set(subscription.ready());
	});
	this.complaints = function() {
		const limit = instance.limit && instance.limit.get();
		const complaints = AdminComplaints.find({}, { limit, sort: { ts: -1, reason: 1 } });
		return complaints.map((c) => {
			c.ts = c.ts.toLocaleString();
			if (c.creatorId) {
				const user = Meteor.users.findOne({ _id: c.creatorId });
				c.creator = user ? user.username : '';
			}

			if (c.userId) {
				const user = Meteor.users.findOne({ _id: c.userId });
				c.userName = user ? user.username : '';
			}

			if (c.roomId) {
				const room = AdminChatRoom.findOne({ _id: c.roomId });
				c.roomName = room ? room.name : '';
			}

			return c;
		});
	};
	this.getSearchTypes = function() {
		return _.map($('[name=complaint-type]:checked'), function(input) {
			return $(input).val();
		});
	};
});

Template.adminComplaints.onRendered(function() {
	Tracker.afterFlush(function() {
		SideNav.setFlex('adminFlex');
		SideNav.openFlex();
	});
});

Template.adminComplaints.events({
	'change [name=from__date]'(e, t) {
		console.log('from__date', e.target.value);
		t.complaintsFromDate.set(e.target.value);
	},
	'change [name=from__time]'(e, t) {
		console.log('from__time', e.target.value);
		t.complaintsFromTime.set(e.target.value);
	},
	'change [name=complaint-type]'(e, t) {
		t.types.set(t.getSearchTypes());
	},
});
