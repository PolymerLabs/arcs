#!/bin/sh 
# target
rm -rf dist
mkdir dist
# sources
cp -f ../canonical.manifest dist/
cp -f source/index.html dist/
# particles
ln -s $PWD/../../../../particles $PWD/dist/particles
# worker build
cp -fR ../../../lib/build/worker.js dist/
# collate sources
echo packing...
npx webpack
echo done.
