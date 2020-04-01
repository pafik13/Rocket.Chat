import { Base } from './_Base';

export class LongTasks extends Base {
	constructor() {
		super();
		this._initModel('long_tasks');
	}
}

export default new LongTasks();
