import { Base } from './_Base';

export class BannedUsers extends Base {
	constructor() {
		super();
		this._initModel('banned_users');
	}
}

export default new BannedUsers();
