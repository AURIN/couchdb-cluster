#!/bin/bash
set -x
curl -XPUT "http://${1}:5984/_global_changes" --header "Content-Type:application/json" \
    --user "admin:${2}"
curl -XPUT "http://${1}:5984/_metadata" --header "Content-Type:application/json" \
    --user "admin:${2}"
curl -XPUT "http://${1}:5984/_replicator" --header "Content-Type:application/json" \
    --user "admin:${2}"
curl -XPUT "http://${1}:5984/_users" --header "Content-Type:application/json" \
    --user "admin:${2}"
