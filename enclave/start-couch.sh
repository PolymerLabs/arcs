#!/bin/sh

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
