# CouchDB 2.0 - Clustered

Based on https://github.com/ConSol/docker-appserver


## BUILDING

Builds the image
```
  docker build -t "couchdbc/2.0.0" .
```

Creates the filesystema to hold the clustered databases:
```
  sudo mkdir -p /var/local/couchdb1
  sudo chown -R `whoami` /var/local/couchdb1
  sudo mkdir -p /var/local/couchdb2
  sudo chown -R `whoami` /var/local/couchdb2
  sudo mkdir -p /var/local/couchdb3
  sudo chown -R `whoami` /var/local/couchdb3
```


## RUNNING

The admin password should be changed, of course, and proably the IP addresses.
```
  node1ip=172.17.0.2
  node2ip=172.17.0.3
  node3ip=172.17.0.4
  pwd=ZSDMB2R8Q25wf557

  node1=`docker create --env NODENAME=${node1ip} --env COUCHDB_USER=admin --env COUCHDB_PASSWORD=${pwd} -v /var/local/couchdb1:/opt/couchdb/data couchdbc/2.0.0`
  echo "docker start ${node1} && docker logs -f ${node1}" > node1.sh && chmod a+x node1.sh

  node2=`docker create --env NODENAME=${node2ip} --env COUCHDB_USER=admin --env COUCHDB_PASSWORD=${pwd} -v /var/local/couchdb2:/opt/couchdb/data couchdbc/2.0.0`
  echo "docker start ${node2} && docker logs -f ${node2}" > node2.sh && chmod a+x node2.sh

  node3=`docker create --env NODENAME=${node3ip} --env COUCHDB_USER=admin --env COUCHDB_PASSWORD=${pwd} -v /var/local/couchdb3:/opt/couchdb/data couchdbc/2.0.0`
  echo "docker start ${node3} && docker logs -f ${node3}" > node3.sh && chmod a+x node3.sh

  cnt="${node1} ${node2} ${node3}" && echo ${cnt}
```


## ADMINISTERING

### Starting and initializing the instances

Starts the instances (each in its own shell)
```
  ./node1.sh
  ./node2.sh
  ./node3.sh
```

Once started, the initial instances have to be some databases added the them to work properly.
```
  ./initdbs.sh ${node1ip} ${pwd}
  ./initdbs.sh ${node2ip} ${pwd}
  ./initdbs.sh ${node3ip} ${pwd}
```

Then the cluster has to be set, using node1 as "master". (The last call should show all three nodes registered in the cluster.)
```
   curl -X PUT "http://${node1ip}:5986/_nodes/couchdb@${node2ip}" -d {} --user "admin:${pwd}"
   curl -X PUT "http://${node1ip}:5986/_nodes/couchdb@${node3ip}" -d {} --user "admin:${pwd}"
   curl -XGET "http://${node1ip}:5984/_membership" \
     --user "admin:${pwd}"
```


### Testing the cluster

These requests create a test database and use two different instances to add documents to it; 
if everything is well, the last three requests should show two document in all three instances.

```
curl -XPUT "http://${node1ip}:5984/test" --header "Content-Type:application/json"\
  --user "admin:${pwd}"
curl -XPOST "http://${node2ip}:5984/test" --header "Content-Type:application/json"\
  --data '{"name":"jock"}' 
curl -XPOST "http://${node3ip}:5984/test" --header "Content-Type:application/json"\
  --data '{"name":"tom"}'

curl -XGET "http://${node1ip}:5984/test/_all_docs" --header "Content-Type:application/json" \
  --user "admin:${pwd}"
curl -XGET "http://${node2ip}:5984/test/_all_docs" --header "Content-Type:application/json" \
  --user "admin:${pwd}"
curl -XGET "http://${node3ip}:5984/test/_all_docs" --header "Content-Type:application/json" \
  --user "admin:${pwd}"
```


### Removing containers

```
  docker stop ${cnt} && docker rm ${cnt}
```

If the filesystems are already there, they must be cleaned before creating a new dataset

```
  rm -rf /var/local/couchdb1/*
  rm -rf /var/local/couchdb2/*
  rm -rf /var/local/couchdb3/*
```

