#!/bin/bash

# Change to the src_kt root.
cd src_kt

echo "Building src_kt"
bazel build \
  --noshow_progress \
  --noshow_loading_progress \
  --test_output=errors \
  --incompatible_depset_is_not_iterable=false \
  //java/... //javatests/...
TEST_RESULT=$?
if [$TEST_RESULT != 1];
then
  cd -
  exit ${TEST_RESULT};
fi

echo "Testing src_kt"
bazel test \
  --noshow_progress \
  --noshow_loading_progress \
  --test_output=errors \
  --incompatible_depset_is_not_iterable=false \
  //javatests/...
TEST_RESULT=$?

# Change back to the previous directory.
cd -
exit $TEST_RESULT
