#!/bin/sh
# Adds the correct repo_root variable to the .bazelrc file

ROOT=$(dirname $0)/..
cd $ROOT
echo "build --define=repo_root=$(pwd)" >> .bazelrc
