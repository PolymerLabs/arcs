#!/bin/sh

# target
rm -rf dist
mkdir dist

./android_deploy.sh dist --display=normal --hide-modules
