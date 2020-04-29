import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { RoomManager, MessageAction } from 'meteor/rocketchat:ui-utils';
import { handleError } from 'meteor/rocketchat:utils';
import { ChatSubscription } from 'meteor/rocketchat:models';

Meteor.startup(() => {
	MessageAction.addButton({
		id: 'complain',
		icon: 'flag',
		label: 'Complain',
		context: ['message', 'message-mobile'],
		action() {
			const message = this._arguments[1];
			return Meteor.call('complainAboutMessage', message._id, function(error) {
				if (error) {
					return handleError(error);
				}
				const subscription = ChatSubscription.findOne({
					rid: message.rid,
				});
				if (subscription == null) {
					return;
				}
				RoomManager.close(subscription.t + subscription.name);
				return FlowRouter.go('home');
			});
		},
		condition(message) {
			return message.u._id !== Meteor.user()._id;
		},
		order: 23,
		group: 'menu',
	});
});
