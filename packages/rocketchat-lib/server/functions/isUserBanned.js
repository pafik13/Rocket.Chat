import { BannedUsers } from 'meteor/rocketchat:models';

export const isUserBanned = (rid, userId) => BannedUsers.isUserIsBanned(rid, userId);
