export { t, isRtl } from '../lib/tapi18n';
export { getDefaultSubscriptionPref } from '../lib/getDefaultSubscriptionPref';
export { Info } from '../rocketchat.info';
export { getUserPreference } from '../lib/getUserPreference';
export { fileUploadMediaWhiteList, fileUploadIsValidContentType } from '../lib/fileUploadRestrictions';
export { spotlightRoomsBlackList, spotlightRoomsIsValidText } from '../lib/spotlightRestrictions';
export { roomTypes } from './lib/roomTypes';
export { RoomTypeRouteConfig, RoomTypeConfig, RoomSettingsEnum, UiTextContext } from '../lib/RoomTypeConfig';
export { RoomTypesCommon } from '../lib/RoomTypesCommon';
export { isDocker } from './functions/isDocker';
export { getMongoInfo, getOplogInfo } from './functions/getMongoInfo';
export { validateUrl } from './functions/validateUrl';
export { validateGeoJSON } from './functions/validateGeoJSON';
export { getAvatarUrlFromUsername } from '../lib/getAvatarUrlFromUsername';
export { slashCommands } from '../lib/slashCommand';
export { getUserNotificationPreference } from '../lib/getUserNotificationPreference';
export { getAvatarColor } from '../lib/getAvatarColor';
export { getURL } from '../lib/getURL';
export { getValidRoomName } from '../lib/getValidRoomName';
export { placeholders } from '../lib/placeholders';
export { composeMessageObjectWithUser } from './lib/composeMessageObjectWithUser';
export { templateVarHandler } from '../lib/templateVarHandler';
export { stringToBoolean } from '../lib/stringToBoolean';
export { hyphenate } from '../lib/hyphenate';
export { complaintReasonsList } from '../lib/complaintReasons';
export { randomInteger } from './functions/randomInteger';

export const HEADER_COUTNRY_CODE = 'X-Country-Code'
export const HEADER_NGINX_GEO_CODE = 'X-Nginx-Geo-Client-Country'
