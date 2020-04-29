#!/usr/bin/env bash
# awk '/;;/' ./queries.sh | awk '{$1=$1};1' |sed -e 's/[[:space:]]*$//' | sed 's/[^a-zA-Z0-9_.-]*$//' | sort -u
RED='\033[0;31m'
NC='\033[0m' # No Color
action=$1
secondArg=$2
thirdArg=$3
fourthArg=$4
fifthArg=$5
HOST=localhost:9200

help() {
  echo "Available commands:"
  echo "  check"
  echo "  health"
  echo "  indeces"
  echo "  master"
  echo "  nodes"
  echo "  ptasks - pending_tasks"
  echo "  tasks"
  echo "  create"
  echo "  delete"
  echo "  get"
  echo "  mapping"
  echo "  getById"
  echo "  delById"
  echo "  getByRoomId"
  echo "  getByUserId"
  echo "  find"
  echo "  find2"
  echo "  find3"
  echo "  find4"
  echo "  find5"
}

check() {
  curl "$HOST/"
}

health() {
  curl "$HOST/_cat/health?v"
}

indeces() {
  curl "$HOST/_cat/indices?v"
}

master() {
  curl "$HOST/_cat/master?v"
}

nodes() {
  curl "$HOST/_cat/nodes?v"
}

ptasks() {
  curl "$HOST/_cat/pending_tasks?v"
}

tasks() {
  curl "$HOST/_cat/tasks?v"
}

create() {
  curl -X PUT "$HOST/subscription" \
    -H 'Content-Type: application/json' -d '
  {
     "settings":{
        "analysis":{
           "tokenizer":{
             "edge_ngram_tokenizer":{
               "type":"edge_ngram",
               "min_gram":"1",
               "max_gram":"20",
               "token_chars":[
                 "letter",
                 "digit"
               ]
             }
           },
           "analyzer":{
             "nGram_analyzer":{
               "type":"custom",
               "tokenizer":"edge_ngram_tokenizer",
               "filter":[
                 "lowercase",
                 "asciifolding"
               ]
             }
           }
         }
       },
       "mappings" : {
         "properties" : {
           "roomId"   : { "type" : "keyword" },
           "userId"   : { "type" : "keyword" },
           "username" : { "type" : "keyword" },
           "usernameAndName" : {
              "type" : "text",
              "analyzer":"nGram_analyzer",
              "search_analyzer": "standard"
           }
         }
       }
  }
  '
}

create2() {
  curl -X PUT "$HOST/subscription" \
    -H 'Content-Type: application/json' -d '
  {
      "mappings" : {
          "properties" : {
              "roomId"    : { "type" : "keyword" },
              "userId"    : { "type" : "keyword" },
              "username"  : { "type" : "keyword" },
              "status"    : { "type" : "boolean" },
              "name"      : { "type" : "text" },
              "utcOffset" : { "type" : "short" },
              "customFields": {
                "properties" : {
                  "anonym_id"    : { "type" : "integer" },
                  "photoUrl"     : { "type" : "keyword" },
                  "registeredAt" : { "type" : "keyword" }
                }
              }
          }
      }
  }
  '
}

delete() {
  curl -X DELETE "$HOST/subscription"
}

get() {
  curl "$HOST/subscription?pretty=true"
}

mapping() {
  curl "$HOST/subscription/_mapping?pretty=true"
}

getById() {
  docId=$secondArg
  curl "$HOST/subscription/_doc/$docId?pretty=true"
}

delById() {
  docId=$secondArg
  curl -X DELETE "$HOST/subscription/_doc/$docId?pretty=true"
}

getByRoomId() {
  roomId=$secondArg
  curl "$HOST/subscription/_search?pretty=true" \
    -H 'Content-Type: application/json' -d '
    {
        "query": {
            "term": {
                "roomId": "'$roomId'"
            }
        }
    }  
  '
}

getByUserId() {
  userId=$secondArg
  curl "$HOST/subscription/_search?pretty=true" \
    -H 'Content-Type: application/json' -d '
    {
        "query": {
            "term": {
                "userId": "'$userId'"
            }
        }
    }  
  '
}


find() {
  text=$secondArg
  curl "$HOST/subscription/_search?pretty=true" \
    -H 'Content-Type: application/json' -d '
    {
      "query": {
          "query_string" : {
            "default_field" : "userName", 
            "query" : "*'$text'*"
          }
      }
    }  
  '
}

find2() {
  text=$secondArg
  curl "$HOST/subscription/_search?pretty=true" \
    -H 'Content-Type: application/json' -d '
    {
      "query": {
          "match" : {
            "userName" : ".*'$text'.*"
          }
      }
    }  
  '
}

find3() {
  text=$secondArg
  curl "$HOST/subscription/_search?pretty=true" \
    -H 'Content-Type: application/json' -d '
    {
      "query": {
          "regexp" : {
            "username" : ".*'$text'.*"
          }
      }
    }  
  '
}

find4() {
  text=$secondArg
  curl "$HOST/subscription/_search?pretty=true" \
    -H 'Content-Type: application/json' -d '
    {
      "query": {
        "bool" : {
          "must": [
            { "match" : { "roomId" : "XDhKnBhRH2etiA6mD" } },
            { "regexp" : { "userName" : ".*'$text'.*" } }
          ]
        }
      }
    }  
  '
}

find5() {
  text=$secondArg
  roomId=$thirdArg
  from=$fourthArg
  size=$fifthArg
  body='
    {
       "from": '${from:-0}', "size" : '${size:-10}',
       "query": {
         "bool": {
           "must": [
             { "match": { "usernameAndName" : "'$text'" } },
             { "match": { "roomId": "'$roomId'" } }
           ]
         }
       }
     }
   '
  echo $body
  curl "$HOST/subscription/_search?pretty=true" \
     -H 'Content-Type: application/json' -d "$body"
}


# Switch action
case "$action" in
     help)
          help;;
     check)
          check;;
     health)
          health;;
     indeces)
          indeces;;
     master)
          master;;
     nodes)
          nodes;;
     ptasks)
          ptasks;;
     tasks)
          tasks;;
     create)
          create;;
     delete)
          delete;;
     get)
          get;;
     mapping)
          mapping;;
     getById)
          getById;;
     delById)
          delById;;
     getByRoomId)
          getByRoomId;;
     getByUserId)
          getByUserId;;
     find)
          find;;
     find2)
          find2;;
     find3)
          find3;;
     find4)
          find4;;
     find5)
          find5;;
     *)
          echo -e "${RED}I don't understand!${NC}"
          help;;
esac