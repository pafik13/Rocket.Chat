# /bin/bash

sudo docker exec -it rocket_mongo mongo --eval 'rs.initiate({_id:"rs0", members: [{"_id":1, "host":"localhost:27017"}]})'
sudo docker exec -it rocket_mongo mongo --eval 'rs.status()'

.circleci/queries.sh check
.circleci/queries.sh create
.circleci/queries.sh create_room
.circleci/queries.sh check
.circleci/queries.sh indeces