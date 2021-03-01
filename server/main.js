import '../imports/startup/server';

import '../lib/RegExp';
import '../lib/francocatena_fix';

import './lib/accounts';
import './lib/pushConfig';
import './lib/roomFiles';
import './startup/migrations';
import './startup/appcache';
import './startup/avatar';
import './startup/cron';
import './startup/initialData';
import './startup/presence';
import './startup/serverRunning';
import './configuration/accounts_meld';
import './methods/OEmbedCacheCleanup';
import './methods/cleanupDeactivations';
import './methods/acceptChannel';
import './methods/acceptDirect';
import './methods/acceptGroup';
import './methods/addAllUserToRoom';
import './methods/addRoomLeader';
import './methods/addRoomModerator';
import './methods/addRoomOwner';
import './methods/afterVerifyEmail';
import './methods/browseChannels';
import './methods/canAccessRoom';
import './methods/channelsList';
import './methods/createDirectMessage';
import './methods/deactivateUserForPeriod';
import './methods/deleteFileMessage';
import './methods/deleteUser';
import './methods/disableUser';
import './methods/enableUser';
import './methods/doDeactivationsDueToComplaints';
import './methods/eraseRoom';
import './methods/getAvatarSuggestion';
import './methods/getMessageOffsetFromLast';
import './methods/getRoomIdByNameOrId';
import './methods/getRoomNameById';
import './methods/getTotalChannels';
import './methods/getUsersOfRoom';
import './methods/getUsersOfRoomByRole';
import './methods/hideRoom';
import './methods/ignoreUser';
import './methods/loadHistory';
import './methods/loadLocale';
import './methods/loadMissedMessages';
import './methods/loadNextMessages';
import './methods/loadSurroundingMessages';
import './methods/logoutCleanUp';
import './methods/messageSearch';
import './methods/migrate';
import './methods/muteUserInRoom';
import './methods/openRoom';
import './methods/processHeavyQuery';
import './methods/readMessages';
import './methods/registerUser';
import './methods/removeRoomLeader';
import './methods/removeRoomModerator';
import './methods/removeRoomOwner';
import './methods/removeUserFromRoom';
import './methods/reportMessage';
import './methods/requestDataDownload';
import './methods/resetAvatar';
import './methods/returnRoomToSearch';
import './methods/roomNameExists';
import './methods/saveUserPreferences';
import './methods/saveUserProfile';
import './methods/setAvatarFromService';
import './methods/setDirectUploadsState';
import './methods/setUserActiveStatus';
import './methods/setUserPassword';
import './methods/toogleFavorite';
import './methods/unmuteUserInRoom';
import './methods/userSetUtcOffset';
import './methods/truncateSubscriptions';
import './methods/cleanupSubscriptions';
import './publications/activeUsers';
import './publications/allMessages';
import './publications/channelAndPrivateAutocomplete';
import './publications/fullUserData';
import './publications/messages';
import './publications/room';
import './publications/roomFiles';
import './publications/roomFilesWithSearchText';
import './publications/roomSubscriptionsByRole';
import './publications/spotlight';
import './publications/subscription';
import './publications/userAutocomplete';
import './publications/userChannels';
import './publications/userData';
import './stream/messages';
import './stream/streamBroadcast';
