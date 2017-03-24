# couchdb-cluster

Scripts for build and deployment of a CouchDB 2.0 Cluster


## Overview

The cluster has 3 CouchDB instances and a load balancer.


## Configuration of sensitive data

Some data are written to the `sensitive.json` file, which is NOT stored on Git, and follows 
this schema:

```
{
  "ssh" : {
    "port": 22,
    "username" : "<name of user able to access the node>",
    "privateKeyFile" : "<path to the user's private SSH key (id_rsa )>"
  },
  "pkgcloud" : {
    "availability_zone" : "<datacentre on which to deploy>",
    "key_name" : "<OpenStack user name>",
    "user_data" : "<base64-encoded script run at VM-creation time to install Docker>",
    "client" : {
      "authUrl" : "<OpenStack authorization URL, usually on port 5000>",
      "region" : "<OpenStack datacentre>",
      "username" : "<OpenStack username>",
      "password" : "<OpenStack password>",
      "provider" : "<provider type in lowercase, such as openstack",
      "tenantName" : "<tenancy name>"
    }
  },
  "docker" : {
    "master" : {
      "protocol" : "<protocol of the Docker demon used to send commands to the cluster, usually HTTP>",
      "host" : "<demon host, usually localhost>",
      "port" : <demon port, usually 2375>
    },
    "client" : {
      "protocol" : "<protocol of the Docker demons on the cluster>",
      "port" : <Docker demon port on the cluster , usually 2375>
    },
    "registry" : {
      "serveraddress" : "<Docker registry URL>",
      "auth" : {
        "email" : "<Docker registry email>",
        "username" : "<Docker registry username>",
        "password" : "<Docker registry password>"
      }
    }
  },
  "test" : {
    "auth" : {
      "username" : "<test user name>",
      "password" : "<test user password>"
    },
  "couchdb" : {
    "auth" : {
      "username" : "admin",
      "password" : "<couchdb admin password>"
    }
  }
  }
}
```

## Docker

There are 2 different images to build

* Apache (front-end and load-balancer)
* CouchDB 


## Target cluster pre-requirements

* All the servers need to have the Docker demon installed and running
* All the servers need to have port 22 open with SSH running
* All images have to be built


## Development machine pre-requirements

* Node.js 4.2.2 installed
* NPM 4.0.2 installed
* Grunt installed `sudo npm install -g grunt --save-dev`
* Grunt-cli installed `npm install grunt-cli --save-dev`
* Docker installed and its daemon running on TCP port 2375 
  (add this line to the `/etc/default/docker` file: 
  `DOCKER_OPTS="-H tcp://0.0.0.0:2375 -H unix:///var/run/docker.sock" --insecure-registry cuttlefish.eresearch.unimelb.edu.au --insecure-registry docker.eresearch.unimelb.edu.au`
  and restart the Docker daemon (`sudo systemctl daemon-reload`)
* Install the project: `npm install`

NOTE: On Ubuntu 15.04 and Docker 1.8.2, set this line:
`ExecStart=/usr/bin/docker daemon -H tcp://0.0.0.0:2375 -H unix:///var/run/docker.sock` 
in `/etc/systemd/system/docker.service` and restart the Docker daemon
con `sudo systemctl daemon-reload; sudo service docker restart`


## Cluster deployment

If the cluster name is not set with the `cluster` CLI option, the default `ccdev` is used. The number of computing nodes can be set by adding the `computing-replication` parameter to the grunt commands. 

* Build of images: `grunt build --cluster <cluster name>`
* Pushing of images to the registry: `grunt push --cluster <cluster name>`
* Provisioning of VMs, setup of security groups: `grunt launch --cluster <cluster name>`
* Docker containers deployments: `grunt pull create`


* Configuration (some containers need re-start): `grunt configure --cluster <cluster name> `
```
  grunt adddefaultdb --ip ccdev-1-couchdbc --no-color
  grunt adddefaultdb --ip ccdev-2-couchdbc --no-color
  grunt adddefaultdb --ip ccdev-3-couchdbc --no-color
```

```
  grunt listnodes --hosts-format
  
  Copy the hostnames and ips to /etc/hosts to simplify following steps
  
  grunt addcouchdbnode --masterip ccdev-1-couchdbc --slaveip 115.146.94.30 --no-color
  grunt addcouchdbnode --masterip ccdev-1-couchdbc --slaveip 115.146.94.29 --no-color
```

## Cluster test 

FIXME: it hangs
`grunt test --cluster <cluster name>`


## Replication setup

```
curl -XPOST "http://ccdev-1-couchdbc:5984/_replicator" \
  --user "admin:Zoo8aikaixeishee"\
  --header "Content-Type:application/json"\
  -vvv\
  --data @- << EOF
   {
   "_id": "geoclassification-development", 
    "source": "http://admin:aurin@db-dev.aurin.org.au:5984/geoclassification-development",
    "target": "geoclassification-development",
    "create_target": false,
    "continuous": true
   }
EOF
```

curl -XGET "http://ccdev-1-couchdbc:5984/_replicator/_all_docs"\
  --user "admin:Zoo8aikaixeishee"

curl -XDELETE "http://ccdev-1-couchdbc:5984/_replicator/geoclassification-development?rev=2-a660aadfa08e6cb497fa6c76dcbd4ad0"\
  --user "admin:Zoo8aikaixeishee"

## Cluster management

* Stopping containers: `grunt stop --cluster <cluster name>`
* Starting containers: `grunt start --cluster <cluster name>`
* Removing containers: `grunt remove --cluster <cluster name>`
* Listing containers: `grunt listcontainers --cluster <cluster name>`
* Listing nodes: `grunt listnodes --cluster <cluster name>`
* Listing security groups: `grunt listsecuritygroups --cluster <cluster name>`


## Cluster un-deployment 

`grunt destroy --cluster <cluster name>`


## Recipes


### Launching a new development cluster


```
grunt launch &&\
grunt configure
```


### Launching a new production cluster

```
grunt launch --cluster cc &&\
grunt configure --cluster cc
```

### Deploying upgraded Docker images to a new development cluster

```
grunt build &&\
grunt push &&\
grunt remove &&\
grunt pull &&\
grunt create &&\
grunt configure
```


### Deploying upgraded Docker images to a new production cluster

```
grunt build --cluster cc &&\
grunt push --cluster cc &&\
grunt remove --cluster cc &&\
grunt pull --cluster cc &&\
grunt create --cluster cc &&\
grunt configure --cluster cc
```


### Deploying updated applications or a changed Apache configuration on a new development cluster

`grunt configure`


### Deploying updated applications or a changed Apache configuration on a new production cluster

`grunt configure --cluster cc`


### Destroying a development cluster

`grunt destroy`


### Destroying a production cluster

`grunt destroy --cluster cc`


### Testing a development cluster

`grunt destroy`


### Testing a production cluster

`grunt destroy --cluster cc`


## NOTES

### Helper commands to manage containers and images

Deletion of unused containers:
```docker ps --filter status=dead --filter status=exited -aq \
  | xargs docker rm -v```
  
Deletion of unused images:
```docker images --no-trunc | grep '<none>' | awk '{ print $3 }' \
    | xargs -r docker rmi```


## KNOWN ISSUES

