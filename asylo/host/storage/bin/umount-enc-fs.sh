#!/bin/bash

if [ "1" != "$#" ] || [ ""a == "$1"a ]; then
	echo "One argument (the name of the encrypted volume) must be specified"
	exit 1
fi
ENCRYPTED_NAME=$1

DEVICE=/dev/mapper/${ENCRYPTED_NAME}
LOOP_DEVICE=`cryptsetup status ${ENCRYPTED_NAME} | grep device | awk '{print $2}'`

echo "Unmounting encrypted filesystem on ${DEVICE}, detaching crypt $ENCRYPTED_NAME and loop $LOOP_DEVICE ..."
umount $DEVICE
cryptsetup close $ENCRYPTED_NAME
losetup -d $LOOP_DEVICE
