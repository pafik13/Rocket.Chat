import loginPage from '../pageobjects/login.page';
import setupWizard from '../pageobjects/setup-wizard.page';

describe('[Login]', () => {
	before(() => {
		localStorage.clear();
		loginPage.open();
	});

	describe('[Render]', () => {
		it('it should show email / username field', () => {
			loginPage.emailOrUsernameField.should('be.visible');
		});

		it('it should show password field', () => {
			loginPage.passwordField.should('be.visible');
		});

		it('it should show submit button', () => {
			loginPage.submitButton.should('be.visible');
		});

		it('it should show register button', () => {
			loginPage.registerButton.should('be.visible');
		});

		it('it should show forgot password button', () => {
			loginPage.forgotPasswordButton.should('be.visible');
		});

		it('it should not show name field', () => {
			loginPage.nameField.should('not.be.visible');
		});

		it('it should not show email field', () => {
			loginPage.emailField.should('not.be.visible');
		});

		it('it should not show confirm password field', () => {
			loginPage.confirmPasswordField.should('not.be.visible');
		});

		it('it should not show back to login button', () => {
			loginPage.backToLoginButton.should('not.be.visible');
		});
	});

	describe('[Required Fields]', () => {
		before(() => {
			loginPage.submit();
		});

		describe('email / username: ', () => {
			it('it should be required', () => {
				loginPage.emailOrUsernameField.should('have.class', 'error');
				loginPage.emailOrUsernameInvalidText.get('text').should('not.be.empty');
			});
		});

		describe('password: ', () => {
			it('it should be required', () => {
				loginPage.passwordField.should('have.class', 'error');
				loginPage.passwordInvalidText.get('text').should('not.be.empty');
			});
		});
	});
});
