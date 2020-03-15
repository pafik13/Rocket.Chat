import loginPage from '../pageobjects/login.page';
import { username, email, password } from '../../data/user.js';


// Basic usage test start
describe('[User Creation]', function() {
	before(() => {
		loginPage.open();
		loginPage.gotToRegister();
	});

	it('it should create user', () => {
		loginPage.registerNewUser({ username, email, password });

		loginPage.submitButton.click();
	});
});
