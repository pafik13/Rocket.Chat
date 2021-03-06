import { Meteor } from 'meteor/meteor';
import { Migrations } from 'meteor/rocketchat:migrations';
import { Users } from 'meteor/rocketchat:models';
import { MAX_RESUME_LOGIN_TOKENS, MIN_RESUME_LOGIN_TOKENS } from '../../lib/accounts';

Migrations.add({
	version: 147,
	async up() {
		await Users.model.rawCollection().aggregate([
			{
				$project: {
					tokens: {
						$filter: {
							input: '$services.resume.loginTokens',
							as: 'token',
							cond: {
								$eq: ['$$token.type', 'personalAccessToken'],
							},
						},
					},
				},
			},
			{ $unwind: '$tokens' },
			{ $group: { _id: '$_id', tokens: { $push: '$tokens' } } },
			{
				$project: {
					sizeOfTokens: { $size: '$tokens' }, tokens: '$tokens' },
			},
			{ $match: { sizeOfTokens: { $gt: MAX_RESUME_LOGIN_TOKENS } } },
			{ $sort: { 'tokens.when': 1 } },
		]).forEach(Meteor.bindEnvironment((user) => {
			const oldestDate = user.tokens.reverse()[MIN_RESUME_LOGIN_TOKENS - 1];
			Users.removeOlderResumeTokensByUserId(user._id, oldestDate.when);
		}));
	},
});
