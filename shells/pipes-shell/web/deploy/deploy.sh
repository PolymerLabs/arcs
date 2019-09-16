#!/bin/sh
# target
mkdir dist
# sources
cp -f ../canonical.manifest dist/
cp -f source/index.html dist/
# particles
mkdir dist/particles
cp -fR ../../../../particles/* dist/particles/
# worker build
cp -fR ../../../lib/build/worker.js dist/
# collate sources
echo packing...
npx webpack
echo done.
