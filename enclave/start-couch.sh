#!/bin/sh

# Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
# This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
# The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
# The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
# Code distributed by Google as part of the polymer project is also
# subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt

# For now, run the asylo code in its own separate Docker image.
if [ ! -e host/storage/key ]; then
	docker run --rm \
		-v $(pwd):/arcs/enclave \
		-v bazel-cache:/root/.cache/bazel \
		-w /arcs/enclave gcr.io/asylo-framework/asylo \
		bazel run --config=enc-sim //arcs_enclave -- --output_file=/arcs/enclave/host/storage/key
fi

docker build -t test-with-asylo .
docker run --privileged -p 5984:5984 \
	-v $(pwd)/host/storage:/opt/storage \
	test-with-asylo
