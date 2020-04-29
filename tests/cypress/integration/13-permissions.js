import sideNav from '../pageobjects/side-nav.page';
import flexTab from '../pageobjects/flex-tab.page';
import admin from '../pageobjects/administration.page';
import mainContent from '../pageobjects/main-content.page';
import { checkIfUserIsValid } from '../../data/checks';
import { username, email, password, adminUsername, adminEmail, adminPassword } from '../../data/user.js';

describe('[Permissions]', () => {
	before(() => {
		checkIfUserIsValid(adminUsername, adminEmail, adminPassword);
		sideNav.sidebarMenu.click();
		sideNav.admin.click();
	});

	after(() => {
		checkIfUserIsValid(adminUsername, adminEmail, adminPassword);
		sideNav.sidebarMenu.click();
		sideNav.admin.click();
		admin.permissionsLink.click();

		admin.rolesUserCreateC.check({ force: true });
		admin.rolesUserCreateD.check({ force: true });
		admin.rolesUserCreateP.check({ force: true });
		admin.rolesUserMentionAll.check({ force: true });
		admin.rolesOwnerDeleteMessage.check({ force: true });
		admin.rolesOwnerEditMessage.check({ force: true });
	});

	describe('user creation via admin view:', () => {
		before(() => {
			admin.usersLink.click();
			flexTab.usersAddUserTab.click();
		});

		after(() => {
			admin.infoLink.click();
		});

		it('it should create a user', () => {
			flexTab.usersAddUserName.type(`adminCreated${ username }`);
			flexTab.usersAddUserUsername.type(`adminCreated${ username }`);
			flexTab.usersAddUserEmail.type(`adminCreated${ email }`);
			flexTab.usersAddUserVerifiedCheckbox.parent().click();
			flexTab.usersAddUserPassword.type(password);
			flexTab.usersAddUserChangePasswordCheckbox.parent().click();
			flexTab.addRole('user');
			flexTab.usersButtonSave.click();
		});

		it('it should show the user in the list', () => {
			admin.usersFilter.click();
			admin.usersFilter.type(`adminCreated${ username }`);
			browser.element('.user-info').should('be.visible');
			browser.element('td').contains(`adminCreated${ username }`).should('be.visible');

		});
	});

	describe('change the permissions:', () => {
		before(() => {
			admin.permissionsLink.click();
			admin.rolesUserCreateC.check({ force: true });
			admin.rolesUserCreateD.check({ force: true });
			admin.rolesUserCreateP.check({ force: true });
			admin.rolesUserMentionAll.check({ force: true });
			admin.rolesOwnerDeleteMessage.check({ force: true });
			admin.rolesOwnerEditMessage.check({ force: true });
		});

		it('it should change the create c room permission', () => {
			admin.rolesUserCreateC.should('be.checked')
			admin.rolesUserCreateC.scrollIntoView();
			admin.rolesUserCreateC.uncheck();
		});

		it('it should change the create d room permission', () => {
			admin.rolesUserCreateD.should('be.checked')
			admin.rolesUserCreateD.scrollIntoView();
			admin.rolesUserCreateD.uncheck();
		});

		it('it should change the create p room permission', () => {
			admin.rolesUserCreateP.should('be.checked')
			admin.rolesUserCreateP.scrollIntoView();
			admin.rolesUserCreateP.uncheck();
		});

		it('it should change the mention all permission', () => {
			admin.rolesUserMentionAll.should('be.checked')
			admin.rolesUserMentionAll.scrollIntoView();
			admin.rolesUserMentionAll.uncheck();
		});

		it('it should change the delete message all permission for owners', () => {
			admin.rolesOwnerDeleteMessage.should('be.checked')
			admin.rolesOwnerDeleteMessage.scrollIntoView();
			admin.rolesOwnerDeleteMessage.uncheck();
		});

		it('it should change the edit message all permission for owners', () => {
			admin.rolesOwnerEditMessage.should('be.checked')
			admin.rolesOwnerEditMessage.scrollIntoView();
			admin.rolesOwnerEditMessage.uncheck();
		});
	});

	describe('test the permissions:', () => {
		before(() => {
			sideNav.preferencesClose.click();

			checkIfUserIsValid(`adminCreated${ username }`, `adminCreated${ email }`, password);
		});

		it('it should not show the plus icon on toolbar ', () => {
			sideNav.newChannelBtn.should('not.be.visible');
		});

		it('it should go to general', () => {
			sideNav.general.click();
		});

		// it.skip('it should not be able to delete own message ', () => {
		// 	// waiting for changes in the delete-message permission
		// });

		// it.skip('it should not be able to edit own message ', () => {
		// 	// waiting for changes in the edit-message permission
		// });

		it('it should try to use @all and should be warned by rocket.cat ', () => {
			mainContent.tryToMentionAll();
		});
	});
});
