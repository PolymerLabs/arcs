#!/bin/sh

echo packing...
./android_deploy.sh dist --display=verbose --profile --json > pack-stats.json

echo studying...
whybundled pack-stats.json
