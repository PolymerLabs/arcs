#!/bin/bash

# Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
# This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
# The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
# The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
# Code distributed by Google as part of the polymer project is also
# subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt

set -e

# TODO writing (and expecting) that the key is stored in plaintext violates so
# much security. That needs to be fixed once we have keys synchronized between
# different instances.

if [ "4" != "$#" ] || [ ""a == "$1"a ] || [ ""a == "$2"a ] || [ ""a == "$3"a ] \
	|| [ ""a == "$4"a ]; then
	echo "Four arguments (the key file, the path to the disk image, the mount"
	echo "point, then encrypted volume name) must be specified"
	exit 1
fi
KEYFILE=$1
IMAGE=$2
MOUNT_POINT=$3
ENCRYPTED_NAME=$4

if [ ! -e $KEYFILE ]; then
	echo "Generating a new key $KEYFILE..."
	cd /arcs/enclave && bazel run --config=enc-sim //arcs_enclave -- --output_file $KEYFILE
	echo -n "New key: "
	cat $KEYFILE
fi

LOOP_DEVICE=$(losetup -f)
ENCRYPTED_DEVICE=/dev/mapper/$ENCRYPTED_NAME

if [ ! -e $IMAGE ]; then
	echo "Creating a new encrypted filesystem in image $IMAGE to"
	echo "loop $LOOP_DEVICE & crypt $ENCRYPTED_NAME ..."
	dd of=$IMAGE bs=1k seek=102400 count=0
	losetup $LOOP_DEVICE $IMAGE

	cryptsetup --key-file $KEYFILE --batch-mode luksFormat $LOOP_DEVICE
	cryptsetup --key-file $KEYFILE open $LOOP_DEVICE $ENCRYPTED_NAME

	mkfs.ext4 $ENCRYPTED_DEVICE
else
	echo "Opening an existing encrypted filesystem from image $IMAGE to"
	echo "loop $LOOP_DEVICE & crypt $ENCRYPTED_NAME ..."
	losetup $LOOP_DEVICE $IMAGE
	cryptsetup --key-file $KEYFILE open $LOOP_DEVICE $ENCRYPTED_NAME
fi

echo "Mounting encrypted filesystem $ENCRYPTED_DEVICE to mountpoint $MOUNT_POINT ..."
if [ ! -d mount ]; then
	mkdir -p $MOUNT_POINT
fi
mount $ENCRYPTED_DEVICE $MOUNT_POINT
