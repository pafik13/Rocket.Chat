import { Meteor } from 'meteor/meteor';
import { LongTasks } from 'meteor/rocketchat:models';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Template } from 'meteor/templating';
import { SideNav, TabBar, RocketChatTabBar } from 'meteor/rocketchat:ui-utils';
import { DateFormat } from 'meteor/rocketchat:lib';
import _ from 'underscore';

Template.adminLongTasks.helpers({
	searchText() {
		const instance = Template.instance();
		return instance.filter && instance.filter.get();
	},
	isReady() {
		const instance = Template.instance();
		return instance.ready && instance.ready.get();
	},
	tasks() {
		return Template.instance().tasks();
	},
	isLoading() {
		const instance = Template.instance();
		if (!(instance.ready && instance.ready.get())) {
			return 'btn-loading';
		}
	},
	hasMore() {
		const instance = Template.instance();
		const tasks = instance.tasks();
		if (instance.limit && instance.limit.get() && tasks && tasks.length) {
			return instance.limit.get() === tasks.length;
		}
	},
	formatDate(date) {
		return DateFormat.formatDateAndTime(date);
	},
	formatParams(params) {
		return JSON.stringify(params || []);
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
});

Template.adminLongTasks.onCreated(function() {
	const instance = this;
	this.limit = new ReactiveVar(50);
	this.filter = new ReactiveVar('');
	this.ready = new ReactiveVar(true);
	this.tabBar = new RocketChatTabBar();
	this.tabBar.showGroup(FlowRouter.current().route.name);
	this.tabBarData = new ReactiveVar;
	TabBar.addButton({
		groups: ['admin-users'],
		id: 'admin-user-info',
		i18nTitle: 'User_Info',
		icon: 'user',
		template: 'adminUserInfo',
		order: 1,
	});
	this.autorun(function() {
		const filter = instance.filter.get();
		const limit = instance.limit.get();
		const subscription = instance.subscribe('adminLongTasks', filter, limit);
		instance.ready.set(subscription.ready());
	});
	this.tasks = function() {
		const limit = instance.limit && instance.limit.get();
		return LongTasks.find({}, { 		limit,
			sort: {
				done: 1,
				ts: 1,
				execs: 1,
				last: 1,
			} }).fetch();
	};
});

Template.adminLongTasks.onRendered(function() {
	Tracker.afterFlush(function() {
		SideNav.setFlex('adminFlex');
		SideNav.openFlex();
	});
});

const DEBOUNCE_TIME_FOR_SEARCH_TASKS_IN_MS = 500;

Template.adminLongTasks.events({
	'keydown #tasks-filter'(e) {
		if (e.which === 13) {
			e.stopPropagation();
			e.preventDefault();
		}
	},
	'keyup #tasks-filter': _.debounce((e, t) => {
		e.stopPropagation();
		e.preventDefault();
		t.filter.set(e.currentTarget.value);
	}, DEBOUNCE_TIME_FOR_SEARCH_TASKS_IN_MS),
	'click .user-info'(e, instance) {
		e.preventDefault();
		console.log(this._id);
		instance.tabBarData.set(Meteor.users.findOne(this._id));
		instance.tabBar.open('admin-user-info');
	},
	'click .info-tabs button'(e) {
		e.preventDefault();
		$('.info-tabs button').removeClass('active');
		$(e.currentTarget).addClass('active');
		$('.user-info-content').hide();
		$($(e.currentTarget).attr('href')).show();
	},
	'click .load-more'(e, t) {
		e.preventDefault();
		e.stopPropagation();
		t.limit.set(t.limit.get() + 50);
	},
});
