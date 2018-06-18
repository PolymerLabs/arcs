#!/bin/bash

if [ "1" != "$#" ] || [ ""a == "$1"a ]; then
	echo "One argument (the name of the encrypted volume) must be specified"
	exit 1
fi
ENCRYPTED_NAME=$1

DEVICE=/dev/mapper/${ENCRYPTED_NAME}

echo "Unmounting encrypted filesystem on ${DEVICE} ..."
umount $DEVICE
cryptsetup close $ENCRYPTED_NAME
