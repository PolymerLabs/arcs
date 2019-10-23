#!/bin/sh

# Aligns the bazel version among the downloaded binary and installed npm one.
BAZEL_VERSION=$(awk -F'[="]' '{if($1 == "BAZEL_VERSION") print $3;}' ../tools/setup)

npm install -g @bazel/bazel@${BAZEL_VERSION}
npm install -g @bazel/ibazel
