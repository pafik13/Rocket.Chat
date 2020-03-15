curl -H "Content-type:application/json" \
      http://localhost:3000/api/v1/login \
      -d '{ "user": "rocketchat.internal.admin.test", "password": "rocketchat.internal.admin.test" }'

curl -X POST \
     -H "Content-type:application/json" \
     -H "X-User-Id: rocketchat.internal.admin.test" \
     -H "X-Auth-Token: iuCj4--let_A6fBu9tX9LVjLFIaDuVICg-X_nP_yb7d" \
     'http://localhost:3000/api/v1/settings/Accounts_ManuallyApproveNewUsers' \
     -d '{ "value": false }'
