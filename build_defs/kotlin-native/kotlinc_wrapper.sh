#!/bin/bash
# Script to run Kotlin Native tools from within the kotlin_native repo. Pass in command
# line args that you want to run.
# The first arg should be the name of the tool you want to run, e.g. "em++".


repo_rel=${BASH_SOURCE[0]}.runfiles/kotlin_native/kotlin-native-macos-1.3.50
repo=$(python -c '
import sys
import os.path
print(os.path.abspath(sys.argv[1]))' "$repo_rel")

konan_deps=${BASH_SOURCE[0]}.runfiles/konan_dependencies
deps=$(python -c '
import sys
import os.path
print(os.path.abspath(sys.argv[1]))' "$konan_deps")

# Space for setting up required environment variables
# ...
#exec $repo/gradlew dependencies:update
#exec $repo/gradlew bundle
#exec $repo/gradlew dist distPlatformLibs

# Run the command line args that were passed to this script.
echo "$repo"
echo "$deps"
exec $repo/bin/kotlinc "-repo $deps" "$@"
