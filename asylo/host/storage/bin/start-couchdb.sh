#!/bin/sh

# Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
# This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
# The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
# The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
# Code distributed by Google as part of the polymer project is also
# subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt


KEY=/opt/storage/key
IMAGE=/opt/storage/db.img
SECURE_MOUNT_POINT=/opt/secure
ENCRYPTED_NAME=encrypted

# TODO use encrypted storage
/opt/storage/bin/mount-enc-fs.sh $KEY $IMAGE $SECURE_MOUNT_POINT $ENCRYPTED_NAME
if [ ! -d $SECURE_MOUNT_POINT ]; then
	echo "No mount found at $SECURE_MOUNT_POINT"
	mount
	exit 1
fi

# add symlinks for couchdb/etc to our storage directory
# Ideally we'd do the same for /opt/couchdb/data, but that's exposed as a
# Docker VOLUME so we remap the 
if [ ! -e ${SECURE_MOUNT_POINT}/couchdb/etc ]; then
	mkdir -p ${SECURE_MOUNT_POINT}/couchdb
	mv /opt/couchdb/etc ${SECURE_MOUNT_POINT}/couchdb/etc
fi
rm -fr /opt/couchdb/etc
ln -s ${SECURE_MOUNT_POINT}/couchdb/etc /opt/couchdb/etc

cat << EEOF > /opt/couchdb/etc/local.d/override-database.ini
[couchdb]
database_dir = ${SECURE_MOUNT_POINT}/couchdb/data
EEOF

/opt/couchdb/bin/couchdb &
PID=$!

# graceful exits
cleanup()
{
	echo "got signal"
	kill ${PID}
	while [ a"`ps -p ${PID} | grep ${PID}`" != a"" ]; do
		echo 'waiting for couch to shutdown..'
		sleep 1s
	done
	/opt/storage/bin/umount-enc-fs.sh $ENCRYPTED_NAME
}
trap cleanup INT TERM
# TODO(smalls) docker container kill isn't triggering the trap

wait $PID
