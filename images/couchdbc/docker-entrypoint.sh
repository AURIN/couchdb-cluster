#!/bin/bash
# Licensed under the Apache License, Version 2.0 (the "License"); you may not
# use this file except in compliance with the License. You may obtain a copy of
# the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations under
# the License.

set -e
set -x
#envsubst < /tmp/local.ini > /opt/couchdb/etc/local.d/local.ini

if [ "$1" = '/opt/couchdb/bin/couchdb' ]; then
  # we need to set the permissions here because docker mounts volumes as root
  chown -R couchdb:couchdb /opt/couchdb

  chmod -R 0770 /opt/couchdb/data

  chmod 664 /opt/couchdb/etc/*.ini
  chmod 664 /opt/couchdb/etc/local.d/*.ini
  chmod 775 /opt/couchdb/etc/*.d

  if [ ! -z "$NODENAME" ] && ! grep "couchdb@" /opt/couchdb/etc/vm.args; then
    echo "-name couchdb@$NODENAME" >> /opt/couchdb/etc/vm.args
  fi

  if [ "$COUCHDB_USER" ] && [ "$COUCHDB_PASSWORD" ]; then
    # Create admin
    printf "[admins]\n%s = %s\n" "$COUCHDB_USER" "$COUCHDB_PASSWORD" > /opt/couchdb/etc/local.d/docker.ini
    chown couchdb:couchdb /opt/couchdb/etc/local.d/docker.ini
  fi

  exec gosu couchdb "$@"
fi

exec "$@"