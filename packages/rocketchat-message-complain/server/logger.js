import { Logger } from 'meteor/rocketchat:logger';

const logger = new Logger('ComplainAboutMessage', {
	sections: {
		connection: 'Connection',
		events: 'Events',
	},
});
export default logger;
