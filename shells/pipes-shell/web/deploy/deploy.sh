#!/bin/sh
# target
mkdir dist
# sources
cp -fR ../canonical.manifest dist/
cp -fR source/index.html dist/
# worker build
cp -fR ../../../lib/build/worker.js dist/
# particles
mkdir dist/particles
cp -fR ../../../../particles-ui/* dist/particles/
# collate sources
echo packing...
npx webpack
echo done.
