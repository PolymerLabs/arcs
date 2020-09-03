#!/bin/bash
# Script to run the Kotlin Native Compiler.

abspath() {
  echo "$(cd "$(dirname "$1")" || return; pwd -P)/$(basename "$1")"
}

case $(ls "${BASH_SOURCE[0]}.runfiles/kotlin_native_compiler/kotlin-native-"*) in
  *windows*)
    PLATFORM="windows"
  ;;
  *macos*)
    PLATFORM="macos"
  ;;
  *linux*)
    PLATFORM="linux"
  ;;
  *)
    echo "Unknown Kotlin Native Compiler platform!"
    exit 1
esac

wrapper_root="${BASH_SOURCE[0]}.runfiles/kotlin_native_compiler"
repo_rel="$wrapper_root/kotlin-native-1.4.0/kotlin-native-$PLATFORM-1.4"
repo=$(abspath "$repo_rel")
deps=$(abspath "$wrapper_root")

export KONAN_DATA_DIR="$deps/"

# Run the command line args that were passed to this script.
exec "$repo/bin/kotlinc" "$@"

