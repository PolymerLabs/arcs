#!/bin/bash
# Script to run the Kotlin Native Compiler.
# Expects a comma-delimited list of dependency files as a first argument.
# The rest of the arguments are passed in to the `kotlinc` compiler.

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
mkdir "$deps/dependencies"
touch "$deps/dependencies/.extracted"
mkdir "$deps/cache"
touch "$deps/cache/.lock"
export KONAN_DATA_DIR="$deps"

IFS=$','
for i in $dependencies; do
  ln -s "$deps/$i/$i" "$deps/dependencies/$i"
  echo "$i" >> "$deps/dependencies/.extracted"
done
unset IFS

# Run the command line args that were passed to this script.
exec $repo/bin/kotlinc "$@"

