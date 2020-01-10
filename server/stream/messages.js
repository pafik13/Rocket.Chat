import { Meteor } from 'meteor/meteor';
import { hasPermission } from 'meteor/rocketchat:authorization';
// import { settings } from 'meteor/rocketchat:settings';
import { Subscriptions, Users, Messages } from 'meteor/rocketchat:models';
import { msgStream } from 'meteor/rocketchat:lib';

const MY_MESSAGE = '__my_messages__';

msgStream.allowWrite('none');

msgStream.allowRead(function(eventName, args) {
	try {
		const room = Meteor.call('canAccessRoom', eventName, this.userId, args);

		if (!room) {
			return false;
		}

		if (room.t === 'c' && !hasPermission(this.userId, 'preview-c-room') && !Subscriptions.findOneByRoomIdAndUserId(room._id, this.userId, { fields: { _id: 1 } })) {
			return false;
		}

		return true;
	} catch (error) {

		/* error*/
		return false;
	}
});

msgStream.allowRead(MY_MESSAGE, 'all');

msgStream.allowEmit(MY_MESSAGE, function(eventName, msg) {
	try {
		const room = Meteor.call('canAccessRoom', msg.rid, this.userId);

		if (!room) {
			return false;
		}

		return {
			roomParticipant: Subscriptions.findOneByRoomIdAndUserId(room._id, this.userId, { fields: { _id: 1 } }) != null,
			roomType: room.t,
			roomName: room.name,
		};

	} catch (error) {
		/* error*/
		return false;
	}
});

Meteor.startup(function() {
	function publishMessage(type, record) {
		if (record._hidden !== true && (record.imported == null)) {
			// const UI_Use_Real_Name = settings.get('UI_Use_Real_Name') === true;

			let user;
			if (record.u && record.u._id) {
				user = Users.findOneByIdWithCustomFields(record.u._id);
				record.u = user;
			}

			if (record.t) {
				// console.log('publishMessage', record._id);
				if (user && record.msg === user.username) {
					record.msg = user.name;
				} else {
					const hero = Users.findOneByUsername(record.msg, { name: 1 });
					if (hero && hero.name) {
						record.msg = hero.name;
					}
				}
			}

			// if (record.mentions && record.mentions.length) {
			// 	record.mentions.forEach((mention) => {
			// 		const user = Users.findOneById(mention._id);
			// 		mention.name = user && user.name;
			// 	});
			// }
			msgStream.mymessage(MY_MESSAGE, record);
			msgStream.emitWithoutBroadcast(record.rid, record);
		}
	}

	return Messages.on('change', function({ clientAction, id, data/* , oplog*/ }) {
		switch (clientAction) {
			case 'inserted':
			case 'updated':
				const message = data || Messages.findOne({ _id: id });
				if (message) {
					publishMessage(clientAction, message);
				} else {
					console.warn('publishMessage', clientAction, id, data);
				}
				break;
		}
	});
});
