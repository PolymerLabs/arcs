#!/bin/bash
# Script to run the Kotlin Native Compiler.
# Expects a comma-delimited list of dependency files as a first argument.
# The rest of the arguments are passed in to the `kotlinc` compiler.


# Create directory if it doesn't exist
soft_mkdir() {
  if [ ! -d "$1" ]; then
   mkdir $1
  fi
}


# Create file if it doesn't exist
soft_touch() {
  if [ ! -f "$1" ]; then
    touch $1
  fi
}

_DEPENDENCIES=$1
shift 1

case $(ls "${BASH_SOURCE[0]}.runfiles/" | grep "kotlin_native_") in
  *windows*)
    PLATFORM="windows"
    idx=0
    ;;
  *macos*)
    PLATFORM="macos"
    idx=1
  ;;
  *linux*)
    PLATFORM="linux"
    idx=2
  ;;
  *)
    echo "Unknown Kotlin Native Compiler platform!"
    exit 1
esac

# Get only relevant platform's dependencies
set -f
_ALL_DEPS=(${_DEPENDENCIES//|/ })
set +f
DEPENDENCIES=${_ALL_DEPS[idx]}


repo_rel="${BASH_SOURCE[0]}.runfiles/kotlin_native_$PLATFORM/kotlin-native-$PLATFORM-1.3.70"
repo=$(python -c '
import sys
import os.path
print(os.path.abspath(sys.argv[1]))' "$repo_rel")

konan_deps=${BASH_SOURCE[0]}.runfiles/
deps=$(python -c '
import sys
import os.path
print(os.path.abspath(sys.argv[1]))' "$konan_deps")

# Space for setting up required environment variables


soft_mkdir "$deps/dependencies"
soft_touch "$deps/dependencies/.extracted"
soft_mkdir "$deps/cache"
soft_touch "$deps/cache/.lock"
export KONAN_DATA_DIR="$deps"

IFS=$','
for i in $DEPENDENCIES; do
  src="$deps/$i/$i"
  dst="$deps/dependencies/$i"
  if [ ! -e "$dst" ]; then
    ln -s "$src" "$dst"
    echo "$i" >> "$deps/dependencies/.extracted"
  fi
done
unset IFS

# Run the command line args that were passed to this script.
exec "$repo/bin/kotlinc" "$@"

