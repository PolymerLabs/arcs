#!/bin/sh

KEY=/opt/storage/key
IMAGE=/opt/storage/db.img
SECURE_MOUNT_POINT=/opt/secure
ENCRYPTED_NAME=encrypted

# TODO use encrypted storage
/opt/storage/bin/mount-enc-fs.sh $KEY $IMAGE $SECURE_MOUNT_POINT $ENCRYPTED_NAME


echo "***********"
ls -ald ${SECURE_MOUNT_POINT}
ls -al ${SECURE_MOUNT_POINT}
cat ${SECURE_MOUNT_POINT}/foo
echo "Now create 'foo' ..."
echo 123 > ${SECURE_MOUNT_POINT}/foo
ls -al ${SECURE_MOUNT_POINT}
cat ${SECURE_MOUNT_POINT}/foo


# add symlinks for couchdb/etc to our storage directory
# Ideally we'd do the same for /opt/couchdb/data, but that's exposed as a
# Docker VOLUME so we remap the 
if [ ! -e /opt/storage/couchdb/etc ]; then
	mkdir -p /opt/storage/couchdb
	mv /opt/couchdb/etc /opt/storage/couchdb/etc
fi
rm -fr /opt/couchdb/etc
ln -s /opt/storage/couchdb/etc /opt/couchdb/etc

cat << EEOF > /opt/couchdb/etc/local.d/override-database.ini
[couchdb]
database_dir = /opt/storage/couchdb/data
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
