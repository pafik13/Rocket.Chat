# sudo awk '{print $3}' /var/log/nginx/rocketchat.access.log | sort | uniq -c | sort -nr | head

curl -H "Content-type:application/json" \
      http://localhost:3000/api/v1/login \
      -d '{ "user": "rocketchat.internal.admin.test", "password": "rocketchat.internal.admin.test" }'

curl -X POST \
     -H "Content-type:application/json" \
     -H "X-User-Id: rocketchat.internal.admin.test" \
     -H "X-Auth-Token: iuCj4--let_A6fBu9tX9LVjLFIaDuVICg-X_nP_yb7d" \
     'http://localhost:3000/api/v1/settings/Accounts_ManuallyApproveNewUsers' \
     -d '{ "value": false }'


curl -H "Content-type:application/json" \
      http://localhost:3000/api/v1/login \
      -d '{ "user": "00maksim00", "password": "p644837" }'

# {
#   "status": "success",
#   "data": {
#     "userId": "rwzj94XmEDrNDX37a",
#     "authToken": "YUjbZl0PPejpXEUVbvvXYlJqCx3AAEleAa0CwgJ-K-h",
#     "authTokenExpires": "2020-12-29T10:01:01.168Z",
#     "me": {
#       "_id": "rwzj94XmEDrNDX37a",
#       "name": "Максим",
#       "emails": [
#         {
#           "address": "u644837@apianon.com",
#           "verified": false
#         }
#       ],
#       "status": "offline",
#       "statusConnection": "offline",
#       "username": "00maksim00",
#       "utcOffset": 3,
#       "active": true,
#       "roles": [
#         "user"
#       ],
#       "settings": {
#         "preferences": {
#           "enableAutoAway": true,
#           "idleTimeLimit": 300,
#           "desktopNotificationDuration": 0,
#           "audioNotifications": "mentions",
#           "unreadAlert": true,
#           "useEmojis": true,
#           "convertAsciiEmoji": true,
#           "autoImageLoad": true,
#           "saveMobileBandwidth": true,
#           "collapseMediaByDefault": false,
#           "hideUsernames": false,
#           "hideRoles": false,
#           "hideFlexTab": false,
#           "hideAvatars": false,
#           "sidebarGroupByType": true,
#           "sidebarViewMode": "medium",
#           "sidebarHideAvatar": false,
#           "sidebarShowUnread": false,
#           "sidebarShowFavorites": true,
#           "sendOnEnter": "normal",
#           "messageViewMode": 0,
#           "emailNotificationMode": "mentions",
#           "roomCounterSidebar": false,
#           "newRoomNotification": "door",
#           "newMessageNotification": "chime",
#           "muteFocusedConversations": true,
#           "notificationsSoundVolume": 100,
#           "desktopNotificationsChannels": "all",
#           "mobileNotificationsChannels": "all",
#           "desktopNotificationsGroups": "all",
#           "mobileNotificationsGroups": "all",
#           "desktopNotificationsDirects": "all",
#           "mobileNotificationsDirects": "all",
#           "isRoomInviteAllowed": true,
#           "isDirectMessagesAllowed": true,
#           "uploadsState": "acceptedAll",
#           "isImageFilesAllowed": true,
#           "isAudioFilesAllowed": true,
#           "isVideoFilesAllowed": true,
#           "isOtherFilesAllowed": true
#         }
#       }
#     }
#   }
# }

curl -X POST \
     -H "Content-type:application/json" \
     -H "X-User-Id: rocketchat.internal.admin.test" \
     -H "X-Auth-Token: iuCj4--let_A6fBu9tX9LVjLFIaDuVICg-X_nP_yb7d" \
     'http://localhost:3000/api/v1/settings/Accounts_ManuallyApproveNewUsers' \
     -d '{ "value": false }'
