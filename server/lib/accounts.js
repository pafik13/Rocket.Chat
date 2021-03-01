import { Meteor } from 'meteor/meteor';
import { Match } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';
import { TAPi18n } from 'meteor/tap:i18n';
import _ from 'underscore';
import s from 'underscore.string';
import { settings } from 'meteor/rocketchat:settings';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { Users, Settings } from 'meteor/rocketchat:models';
import { addUserRoles } from 'meteor/rocketchat:authorization';

const accountsConfig = {
	forbidClientAccountCreation: true,
	loginExpirationInDays: settings.get('Accounts_LoginExpiration'),
	defaultFieldSelector: {
		tokens: 0,
		subscriptions: 0,
	},
};

Accounts.config(accountsConfig);

Accounts.emailTemplates.siteName = settings.get('Site_Name');

Accounts.emailTemplates.from = `${ settings.get('Site_Name') } <${ settings.get('From_Email') }>`;

Accounts.emailTemplates.userToActivate = {
	subject() {
		const subject = TAPi18n.__('Accounts_Admin_Email_Approval_Needed_Subject_Default');
		const siteName = settings.get('Site_Name');

		return `[${ siteName }] ${ subject }`;
	},

	html() {
		return '';
	},
};

Accounts.emailTemplates.userActivated = {
	subject({ active, username }) {
		const activated = username ? 'Activated' : 'Approved';
		const action = active ? activated : 'Deactivated';
		const subject = `Accounts_Email_${ action }_Subject`;
		const siteName = settings.get('Site_Name');

		return `[${ siteName }] ${ TAPi18n.__(subject) }`;
	},

	html() {
		return '';
	},
};



Accounts.emailTemplates.verifyEmail.html = function() {
	return '';
};

Accounts.urls.resetPassword = function(token) {
	return Meteor.absoluteUrl(`reset-password/${ token }`);
};

Accounts.emailTemplates.resetPassword.html = Accounts.emailTemplates.resetPassword.text;

Accounts.emailTemplates.enrollAccount.subject = function() {
	return '';
};

Accounts.emailTemplates.enrollAccount.html = function() {
	return '';
};

Accounts.onCreateUser(function(options, user = {}) {
	callbacks.run('beforeCreateUser', options, user);

	user.status = 'offline';
	user.active = !settings.get('Accounts_ManuallyApproveNewUsers');

	if (!user.name) {
		if (options.profile) {
			if (options.profile.name) {
				user.name = options.profile.name;
			} else if (options.profile.firstName && options.profile.lastName) {
				// LinkedIn format
				user.name = `${ options.profile.firstName } ${ options.profile.lastName }`;
			} else if (options.profile.firstName) {
				// LinkedIn format
				user.name = options.profile.firstName;
			}
		}
	}

	if (user.services) {
		for (const service of Object.values(user.services)) {
			if (!user.name) {
				user.name = service.name || service.username;
			}

			if (!user.emails && service.email) {
				user.emails = [{
					address: service.email,
					verified: true,
				}];
			}
		}
	}
	return user;
});

Accounts.insertUserDoc = _.wrap(Accounts.insertUserDoc, function(insertUserDoc, options, user) {
	let roles = [];

	if (Match.test(user.globalRoles, [String]) && user.globalRoles.length > 0) {
		roles = roles.concat(user.globalRoles);
	}

	delete user.globalRoles;

	if (user.services && !user.services.password) {
		const defaultAuthServiceRoles = String(settings.get('Accounts_Registration_AuthenticationServices_Default_Roles')).split(',');
		if (defaultAuthServiceRoles.length > 0) {
			roles = roles.concat(defaultAuthServiceRoles.map((s) => s.trim()));
		}
	}

	if (!user.type) {
		user.type = 'user';
	}

	const _id = insertUserDoc.call(Accounts, options, user);

	user = Meteor.users.findOne({
		_id,
	});

	if (user.username) {
		if (user.type !== 'visitor') {
			Meteor.defer(function() {
				return callbacks.run('afterCreateUser', user);
			});
		}
	}

	if (roles.length === 0) {
		const hasAdmin = Users.findOne({
			roles: 'admin',
			type: 'user',
		}, {
			fields: {
				_id: 1,
			},
		});

		if (hasAdmin) {
			roles.push('user');
		} else {
			roles.push('admin');
			if (settings.get('Show_Setup_Wizard') === 'pending') {
				Settings.updateValueById('Show_Setup_Wizard', 'in_progress');
			}
		}
	}

	addUserRoles(_id, roles);

	return _id;
});

Accounts.validateLoginAttempt(function(login) {
	login = callbacks.run('beforeValidateLogin', login);

	if (login.allowed !== true) {
		return login.allowed;
	}

	if (login.user.type === 'visitor') {
		return true;
	}

	if (!!login.user.active !== true) {
		throw new Meteor.Error('error-user-is-not-activated', 'User is not activated', {
			function: 'Accounts.validateLoginAttempt',
		});
	}

	if (!login.user.roles || !Array.isArray(login.user.roles)) {
		throw new Meteor.Error('error-user-has-no-roles', 'User has no roles', {
			function: 'Accounts.validateLoginAttempt',
		});
	}

	if (login.user.roles.includes('admin') === false && login.type === 'password' && settings.get('Accounts_EmailVerification') === true) {
		const validEmail = login.user.emails.filter((email) => email.verified === true);
		if (validEmail.length === 0) {
			throw new Meteor.Error('error-invalid-email', 'Invalid email __email__');
		}
	}

	login = callbacks.run('onValidateLogin', login);

	Users.updateLastLoginById(login.user._id);
	Meteor.defer(function() {
		return callbacks.run('afterValidateLogin', login);
	});

	return true;
});

Accounts.validateNewUser(function(user) {
	console.log('validateNewUser', user);

	if (user.type === 'visitor') {
		return true;
	}

	if (settings.get('Accounts_Registration_AuthenticationServices_Enabled') === false && settings.get('LDAP_Enable') === false && !(user.services && user.services.password)) {
		throw new Meteor.Error('registration-disabled-authentication-services', 'User registration is disabled for authentication services');
	}
	return true;
});

Accounts.validateNewUser(function(user) {
	console.log('validateNewUser', user);

	if (user.type === 'visitor') {
		return true;
	}

	let domainWhiteList = settings.get('Accounts_AllowedDomainsList');
	if (_.isEmpty(s.trim(domainWhiteList))) {
		return true;
	}

	domainWhiteList = domainWhiteList.split(',').map((domain) => domain.trim());

	if (user.emails && user.emails.length > 0) {
		const email = user.emails[0].address;
		const inWhiteList = domainWhiteList.some((domain) => email.match(`@${ RegExp.escape(domain) }$`));

		if (inWhiteList === false) {
			throw new Meteor.Error('error-invalid-domain');
		}
	}
	return true;
});

export const MAX_RESUME_LOGIN_TOKENS = parseInt(process.env.MAX_RESUME_LOGIN_TOKENS) || 50;
export const MIN_RESUME_LOGIN_TOKENS = parseInt(process.env.MIN_RESUME_LOGIN_TOKENS) || 10;

Accounts.onLogin(async({ user }) => {
	if (!user || !user.services || !user.services.resume || !user.services.resume.loginTokens) {
		return;
	}
	const { loginTokens } = user.services.resume;

	if (loginTokens.length < MAX_RESUME_LOGIN_TOKENS) {
		return;
	}

	const oldestDate = loginTokens.reverse()[MIN_RESUME_LOGIN_TOKENS - 1];

	Users.removeOlderResumeTokensByUserId(user._id, oldestDate.when);
});
