#!/bin/sh

# TODO mount encrypted storage


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

exec /opt/couchdb/bin/couchdb
