#!/bin/bash
#
# Script to install the Android SDK in bazel on Travis. This is a fairly
# complicated procedure: the Android SDK installer requires an old version of
# the JDK (1.8), so we need to switch to that first. Then we need to explicitly
# run a bazel target to install the SDK.
set -e

# Edit android_sdk.bzl to indicate we're running on Travis.
sed -i'.bak' 's/_RUNNING_ON_TRAVIS = False/_RUNNING_ON_TRAVIS = True/g' android_sdk.bzl

# Install jdk_switcher.
cd /tmp
git clone https://github.com/michaelklishin/jdk_switcher
source ./jdk_switcher/jdk_switcher.sh
cd -

# Switch to Java 8 (JDK 1.8) (necessary for running Android sdkmanager).
jdk_switcher use openjdk8

# Run the Android SDK installer.
yes | bazel run @androidsdk//install
