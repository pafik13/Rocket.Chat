import { settings } from 'meteor/rocketchat:settings';

settings.addGroup('General', function() {
	this.section('REST API', function() {
		this.add('API_Upper_Count_Limit', 100, { type: 'int', public: false });
		this.add('API_Default_Count', 50, { type: 'int', public: false });
		this.add('API_Allow_Infinite_Count', true, { type: 'boolean', public: false });
		this.add('API_Enable_Direct_Message_History_EndPoint', false, { type: 'boolean', public: false });
		this.add('API_Enable_Shields', true, { type: 'boolean', public: false });
		this.add('API_Shield_Types', '*', { type: 'string', public: false, enableQuery: { _id: 'API_Enable_Shields', value: true } });
		this.add('API_Enable_CORS', false, { type: 'boolean', public: false });
		this.add('API_CORS_Origin', '*', { type: 'string', public: false, enableQuery: { _id: 'API_Enable_CORS', value: true } });
		this.add('API_Enable_Spam_Detection', false, { type: 'boolean', public: false });
		this.add('API_Spam_Detection_Threshold_SendMessage', 6, { type: 'int', public: false, enableQuery: { _id: 'API_Enable_Spam_Detection', value: true } });
		this.add('API_Spam_Detection_Threshold_IMCreate', 3, { type: 'int', public: false, enableQuery: { _id: 'API_Enable_Spam_Detection', value: true } });
		this.add('API_Spam_Detection_Cache_TTL_In_Seconds', 120, { type: 'int', public: false, enableQuery: { _id: 'API_Enable_Spam_Detection', value: true } });
		this.add('API_Notify_About_Spammer_URL', '', { type: 'string', public: false, enableQuery: { _id: 'API_Enable_Spam_Detection', value: true } });
		this.add('API_Notify_About_Spammer_Auth_Token', '', { type: 'string', public: false, enableQuery: { _id: 'API_Enable_Spam_Detection', value: true } });
	});
});
