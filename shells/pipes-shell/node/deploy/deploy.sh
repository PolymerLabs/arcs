#!/bin/sh
# target
mkdir dist
# sources
cp -f ../canonical.manifest dist/
cp -f source/serve.sh dist/
# particles
mkdir dist/particles
cp -fR ../../../../particles/* dist/particles/
# collate sources
echo packing...
npx webpack
echo done.

