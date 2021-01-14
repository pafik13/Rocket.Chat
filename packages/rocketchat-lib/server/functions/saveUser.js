import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import _ from 'underscore';
import s from 'underscore.string';
import { getRoles, hasPermission } from 'meteor/rocketchat:authorization';
import { settings } from 'meteor/rocketchat:settings';
import PasswordPolicy from '../lib/PasswordPolicyClass';
import { checkEmailAvailability, checkUsernameAvailability, setEmail, setRealName, setUsername } from '.';
import { validateEmailDomain } from '../lib';
import { callbacks } from 'meteor/rocketchat:callbacks';
import { Users } from 'meteor/rocketchat:models';

const passwordPolicy = new PasswordPolicy();

function validateUserData(userId, userData) {
	const existingRoles = _.pluck(getRoles(), '_id');

	if (userData._id && userId !== userData._id && !hasPermission(userId, 'edit-other-user-info')) {
		throw new Meteor.Error('error-action-not-allowed', 'Editing user is not allowed', {
			method: 'insertOrUpdateUser',
			action: 'Editing_user',
		});
	}

	if (!userData._id && !hasPermission(userId, 'create-user')) {
		throw new Meteor.Error('error-action-not-allowed', 'Adding user is not allowed', {
			method: 'insertOrUpdateUser',
			action: 'Adding_user',
		});
	}

	if (userData.roles && _.difference(userData.roles, existingRoles).length > 0) {
		throw new Meteor.Error('error-action-not-allowed', 'The field Roles consist invalid role name', {
			method: 'insertOrUpdateUser',
			action: 'Assign_role',
		});
	}

	if (userData.roles && _.indexOf(userData.roles, 'admin') >= 0 && !hasPermission(userId, 'assign-admin-role')) {
		throw new Meteor.Error('error-action-not-allowed', 'Assigning admin is not allowed', {
			method: 'insertOrUpdateUser',
			action: 'Assign_admin',
		});
	}

	if (!userData._id && !s.trim(userData.name)) {
		throw new Meteor.Error('error-the-field-is-required', 'The field Name is required', {
			method: 'insertOrUpdateUser',
			field: 'Name',
		});
	}

	if (!userData._id && !s.trim(userData.username)) {
		throw new Meteor.Error('error-the-field-is-required', 'The field Username is required', {
			method: 'insertOrUpdateUser',
			field: 'Username',
		});
	}

	let nameValidation;

	try {
		nameValidation = new RegExp(`^${ settings.get('UTF8_Names_Validation') }$`);
	} catch (e) {
		nameValidation = new RegExp('^[0-9a-zA-Z-_.]+$');
	}

	if (userData.username && !nameValidation.test(userData.username)) {
		throw new Meteor.Error('error-input-is-not-a-valid-field', `${ _.escape(userData.username) } is not a valid username`, {
			method: 'insertOrUpdateUser',
			input: userData.username,
			field: 'Username',
		});
	}

	if (!userData._id && !userData.password) {
		throw new Meteor.Error('error-the-field-is-required', 'The field Password is required', {
			method: 'insertOrUpdateUser',
			field: 'Password',
		});
	}

	if (!userData._id) {
		if (!checkUsernameAvailability(userData.username)) {
			throw new Meteor.Error('error-field-unavailable', `${ _.escape(userData.username) } is already in use :(`, {
				method: 'insertOrUpdateUser',
				field: userData.username,
			});
		}

		if (userData.email && !checkEmailAvailability(userData.email)) {
			throw new Meteor.Error('error-field-unavailable', `${ _.escape(userData.email) } is already in use :(`, {
				method: 'insertOrUpdateUser',
				field: userData.email,
			});
		}
	}
}

function validateUserEditing(userId, userData) {
	const editingMyself = false;

	const canEditOtherUserInfo = hasPermission(userId, 'edit-other-user-info');
	const canEditOtherUserPassword = hasPermission(userId, 'edit-other-user-password');

	if (userData.roles && !hasPermission(userId, 'assign-roles')) {
		throw new Meteor.Error('error-action-not-allowed', 'Assign roles is not allowed', {
			method: 'insertOrUpdateUser',
			action: 'Assign_role',
		});
	}

	if (!settings.get('Accounts_AllowUserProfileChange') && !canEditOtherUserInfo && !canEditOtherUserPassword) {
		throw new Meteor.Error('error-action-not-allowed', 'Edit user profile is not allowed', {
			method: 'insertOrUpdateUser',
			action: 'Update_user',
		});
	}

	if (userData.username && !settings.get('Accounts_AllowUsernameChange') && (!canEditOtherUserInfo || editingMyself)) {
		throw new Meteor.Error('error-action-not-allowed', 'Edit username is not allowed', {
			method: 'insertOrUpdateUser',
			action: 'Update_user',
		});
	}

	if (userData.name && !settings.get('Accounts_AllowRealNameChange') && (!canEditOtherUserInfo || editingMyself)) {
		throw new Meteor.Error('error-action-not-allowed', 'Edit user real name is not allowed', {
			method: 'insertOrUpdateUser',
			action: 'Update_user',
		});
	}

	if (userData.email && !settings.get('Accounts_AllowEmailChange') && (!canEditOtherUserInfo || editingMyself)) {
		throw new Meteor.Error('error-action-not-allowed', 'Edit user email is not allowed', {
			method: 'insertOrUpdateUser',
			action: 'Update_user',
		});
	}

	if (userData.password && !settings.get('Accounts_AllowPasswordChange') && (!canEditOtherUserPassword || editingMyself)) {
		throw new Meteor.Error('error-action-not-allowed', 'Edit user password is not allowed', {
			method: 'insertOrUpdateUser',
			action: 'Update_user',
		});
	}
}

export const saveUser = function(userId, userData) {
	validateUserData(userId, userData);

	if (!userData._id) {
		validateEmailDomain(userData.email);

		// insert user
		const createUser = {
			username: userData.username,
			password: userData.password,
		};
		if (userData.email) {
			createUser.email = userData.email;
		}

		console.log('createUser', createUser);
		const _id = Accounts.createUser(createUser);

		const updateUser = {
			$set: {
				name: userData.name,
				roles: userData.roles || ['user'],
				settings: userData.settings || {},
				tokens: [],
				subscriptions: [],
			},
		};

		if (typeof userData.requirePasswordChange !== 'undefined') {
			updateUser.$set.requirePasswordChange = userData.requirePasswordChange;
		}

		if (typeof userData.verified === 'boolean') {
			updateUser.$set['emails.0.verified'] = userData.verified;
		}

		Meteor.users.update({ _id }, updateUser);

		const { joinDefaultChannels } = userData;
		if (joinDefaultChannels !== false) {
			Meteor.runAsUser(_id, function() {
				return Meteor.call('joinDefaultChannels', false);
			});
		}

		userData._id = _id;

		return _id;
	}

	validateUserEditing(userId, userData);

	// update user
	if (userData.username) {
		setUsername(userData._id, userData.username);
	}

	if (userData.name) {
		setRealName(userData._id, userData.name);
	}

	if (userData.email) {
		const shouldSendVerificationEmailToUser = userData.verified !== true;
		setEmail(userData._id, userData.email, shouldSendVerificationEmailToUser);
	}

	if (userData.password && userData.password.trim() && hasPermission(userId, 'edit-other-user-password') && passwordPolicy.validate(userData.password)) {
		Accounts.setPassword(userData._id, userData.password.trim());
	}

	const updateUser = {
		$set: {},
	};

	if (userData.roles) {
		updateUser.$set.roles = userData.roles;
	}
	if (userData.settings) {
		updateUser.$set.settings = { preferences: userData.settings.preferences };
	}

	if (userData.language) {
		updateUser.$set.language = userData.language;
	}

	if (typeof userData.requirePasswordChange !== 'undefined') {
		updateUser.$set.requirePasswordChange = userData.requirePasswordChange;
	}

	if (typeof userData.verified === 'boolean') {
		updateUser.$set['emails.0.verified'] = userData.verified;
	}

	Meteor.users.update({ _id: userData._id }, updateUser);

	const user = Users.findOneById(userData._id, { fields: { name: 1, username: 1 } });
	Meteor.defer(function() {
		callbacks.run('afterSaveUser', user);
	});
	return true;
};
