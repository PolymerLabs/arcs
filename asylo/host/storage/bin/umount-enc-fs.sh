#!/bin/bash

# Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
# This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
# The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
# The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
# Code distributed by Google as part of the polymer project is also
# subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt

if [ "1" != "$#" ] || [ a"" == a"$1" ]; then
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
