#!/bin/bash
#
# Simple script to run Android Kotlin and shell tests locally.

echo "Building java, javatests, and shells/android"
bazel build \
  --noshow_progress \
  --noshow_loading_progress \
  --test_output=errors \
  --incompatible_depset_is_not_iterable=false \
  //java/... //javatests/... //shells/android/...
TEST_RESULT=$?
if [$TEST_RESULT != 1];
then
  cd -
  exit ${TEST_RESULT};
fi

echo "Testing java, javatests, and shells/android"
bazel test \
  --noshow_progress \
  --noshow_loading_progress \
  --test_output=errors \
  --incompatible_depset_is_not_iterable=false \
  //java/... //javatests/... //shells/android/javatests/...
TEST_RESULT=$?

exit $TEST_RESULT
