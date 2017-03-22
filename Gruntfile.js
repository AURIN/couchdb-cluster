"use strict";

module.exports = function(grunt) {

  grunt.sensitiveConfig = grunt.file.readJSON("./sensitive.json");
  grunt.customConfig = grunt.file.readJSON("./custom-configuration.json");

  if (!grunt.option("cluster")) {
    grunt.log.writeln("grunt [TASK] {--cluster [CLUSTER NAME]}");
  }

  grunt
      .initConfig({
        pkg : grunt.file.readJSON("./package.json"),
        wait : {
          pause : {
            options : {
              // Time to wait (it must be increased when the number of
              // nodes increases)
              delay : 60000,
              before : function(options) {
                console.log("Pausing %ds", options.delay / 1000);
              },
              after : function() {
                console.log("End pause");
              }
            }
          }
        },

        dock : {
          options : {
            auth : grunt.sensitiveConfig.docker.registry.auth,
            registry : grunt.sensitiveConfig.docker.registry.serveraddress,
            // Local docker demon used to send Docker commands to the cluster
            docker : grunt.sensitiveConfig.docker.master,
            // Options for the Docker clients on the servers
            dockerclient : grunt.sensitiveConfig.docker.client,

            images : {
              couchdbc : {
                dockerfile : "./images/couchdbc",
                tag : "2.0.0",
                repo : "couchdbc",
                options : {
                  build : {
                    t : grunt.sensitiveConfig.docker.registry.serveraddress
                        + "/couchdbc:2.0.0",
                    pull : false,
                    nocache : false
                  },
                  run : {
                    create : {
                      HostConfig : {
                        Binds : [ "/home/ubuntu/:/hostvolume" ],
                        NetworkMode : "host"
                      }
                    },
                    start : {},
                    cmd : []
                  }
                }
              }
            }
          }
        },

        clouddity : {
          pkgcloud : grunt.sensitiveConfig.pkgcloud,
          docker : grunt.sensitiveConfig.docker,
          ssh : grunt.sensitiveConfig.ssh,
          cluster : grunt.option("cluster") || "ccdev",

          nodetypes : [ {
            name : "couchdbc",
            replication : 3,
            imageRef : "73c6f8d8-f885-4253-8bee-e45da068fb65",
            flavorRef : "885227de-b7ee-42af-a209-2f1ff59bc330",
            securitygroups : [ "defaultsg", "loadbalancersg" ],
            copytohost : [ {
              from : "./target/nodetypes/loadbalancer/",
              to : "/home/ubuntu"
            } ],
            images : [ "couchdbc" ],
            test : [ {
              name : "Cluster nodes",
              auth : grunt.sensitiveConfig.kibana.auth,
              protocol : "http",
              port : 80,
              path : "/kibana/app/kibana",
              shouldContain : "kibana"
            } ]
          } ],

          securitygroups : {
            "defaultsg" : {
              description : "Opens the Docker demon and SSH ports to dev and cluster nodes",
              rules : [ {
                direction : "ingress",
                ethertype : "IPv4",
                protocol : "tcp",
                portRangeMin : 22,
                portRangeMax : 22,
                remoteIpPrefix : grunt.customConfig.devIPs
              }, {
                direction : "ingress",
                ethertype : "IPv4",
                protocol : "tcp",
                portRangeMin : 2375,
                portRangeMax : 2375,
                remoteIpPrefix : grunt.customConfig.devIPs
              } ]
            },
            "couchdbsg" : {
              description : "Opens CouchDB cluster ports to the cluster ,and 5984 to the world",
              rules : [ {
                direction : "ingress",
                ethertype : "IPv4",
                protocol : "tcp",
                portRangeMin : 5984,
                portRangeMax : 5984,
                remoteIpPrefix : "0.0.0.0/0"
              }, {
                direction : "ingress",
                ethertype : "IPv4",
                protocol : "tcp",
                portRangeMin : 4369,
                portRangeMax : 4369,
                remoteIpPrefix : grunt.customConfig.devIPs,
                remoteIpNodePrefixes : [ "couchdbc" ]
              }, {
                direction : "ingress",
                ethertype : "IPv4",
                protocol : "tcp",
                portRangeMin : 5986,
                portRangeMax : 5986,
                remoteIpPrefix : grunt.customConfig.devIPs,
                remoteIpNodePrefixes : [ "couchdbc" ]
              }, {
                direction : "ingress",
                ethertype : "IPv4",
                protocol : "tcp",
                portRangeMin : 9100,
                portRangeMax : 9200,
                remoteIpPrefix : grunt.customConfig.devIPs,
                remoteIpNodePrefixes : [ "couchdbc" ]
              } ]
            }
          }
        },

        // Configures the cluster
        http : {
          configureurl : {
            options : {
              url : "http://" + (grunt.option("cluster") || "oadev")
                  + "-1-loadbalancer/reg/dataregistry/url",
              method : "put",
              auth : grunt.sensitiveConfig.test.auth,
              body : grunt.customConfig[(grunt.option("cluster") || "oadev")].dataregistryurl
            }
          }
        }
      });

  // Dependent tasks declarations
  require("load-grunt-tasks")(grunt, {
    config : "./package.json"
  });
  grunt.loadNpmTasks("grunt-wait");

  // Setups and builds the Docker images
  grunt.registerTask("build", [ "dock:build" ]);

  // Pushes the Docker images to registry
  grunt.registerTask("push", [ "dock:push" ]);

  // Utility tasks to provision and un-provision the cluster in one go
  grunt.registerTask("launch", [ "clouddity:createsecuritygroups", "wait",
      "clouddity:createnodes", "wait", "clouddity:updatesecuritygroups",
      "wait", "clouddity:addhosts" ]);
  grunt.registerTask("destroy", [ "clouddity:destroynodes", "wait",
      "clouddity:destroysecuritygroups" ]);

  // Pulls the Docker images from registry
  grunt.registerTask("pull", [ "clouddity:pull" ]);

  // Configure the CouchDB cluster once the cluster is launched
  grunt.registerTask("configure", [ "http:configureurl", "http:geoserveruser",
      "http:geoserverpassword", "http:schedule", "restart" ]);

  // Listing cluster components tasks
  grunt.registerTask("listsecuritygroups", [ "clouddity:listsecuritygroups" ]);
  grunt.registerTask("listnodes", [ "clouddity:listnodes" ]);
  grunt.registerTask("listcontainers", [ "clouddity:listcontainers" ]);

  // Docker containers creation
  grunt.registerTask("create", [ "clouddity:run" ]);

  // Docker containers management
  grunt.registerTask("stop", [ "clouddity:stop" ]);
  grunt.registerTask("start", [ "clouddity:start" ]);
  grunt.registerTask("restart", [ "clouddity:stop", "clouddity:start" ]);

  // Docker containers removal
  grunt
      .registerTask("remove", [ "clouddity:stop", "wait", "clouddity:remove" ]);

  // Tests the deployed containers
  grunt.registerTask("test", [ "clouddity:test" ]);
};
