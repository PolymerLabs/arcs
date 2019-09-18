#!/bin/bash
# Script to run Kotlin Native tools from within the kotlin_native repo. Pass in command
# line args that you want to run.
# The first arg should be the name of the tool you want to run, e.g. "em++".

dependencies=$1
shift 1

repo_rel=${BASH_SOURCE[0]}.runfiles/kotlin_native/kotlin-native-macos-1.3.50
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
echo "$deps"
mkdir "$deps/dependencies"
touch "$deps/dependencies/.extracted"
mkdir "$deps/cache"
touch "$deps/cache/.lock"
export KONAN_DATA_DIR="$deps"

IFS=$','
for i in $dependencies; do ln -s "$deps/$i/$i" "$deps/dependencies/$i"; done
unset IFS
IFS=$','
for i in $dependencies; do echo "$i" >> "$deps/dependencies/.extracted"; done
unset IFS


# Run the command line args that were passed to this script.
echo "$(pwd)"
ls -l scratch
echo $repo/bin/kotlinc "$@"
exec $repo/bin/kotlinc "$@"
ls -l

