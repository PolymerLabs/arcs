#!/bin/bash
# Script to install bazel. Should be usable in Dockerfile.CI, by the
# tools/setup script, and locally.
set -e

# KEEP UP TO DATE WITH build_defs/bazel_version_check.bzl
BAZEL_VERSION="1.2.0"

# Detect Platform
case $(uname | tr '[:upper:]' '[:lower:]') in
  linux*)
    BAZEL_DEP="https://github.com/bazelbuild/bazel/releases/download/$BAZEL_VERSION/bazel-$BAZEL_VERSION-installer-linux-x86_64.sh"
    ;;
  darwin*)
    BAZEL_DEP="https://github.com/bazelbuild/bazel/releases/download/$BAZEL_VERSION/bazel-$BAZEL_VERSION-installer-darwin-x86_64.sh"
    ;;
  msys*)
    BAZEL_DEP="https://github.com/bazelbuild/bazel/releases/download/$BAZEL_VERSION/bazel-$BAZEL_VERSION-windows-x86_64.exe"
    # TODO(alxr) investigate windows compatability
    >2& echo "Windows is currently unsupported. Please follow install instructions in the README."
    exit 1
    ;;
  *)
    >2& echo "Can't detect host OS"
    exit 1
    ;;
esac

BAZEL_SCRIPT_NAME=$(basename "$BAZEL_DEP")

# Show what commands are being run.
set -x

curl -L -s -O "$BAZEL_DEP" --output "$BAZEL_SCRIPT_NAME"
chmod +x "$BAZEL_SCRIPT_NAME"
"./$BAZEL_SCRIPT_NAME" --user
rm "$BAZEL_SCRIPT_NAME"
