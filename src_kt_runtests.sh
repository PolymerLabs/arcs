#!/bin/bash

bazel clean --expunge
cd src_kt
bazel clean --expunge
bazel test \
  --noshow_progress \
  --noshow_loading_progress \
  --test_output=errors \
  --incompatible_depset_is_not_iterable=false \
  //javatests/...
TEST_RESULT=$?
cd -
exit $TEST_RESULT
