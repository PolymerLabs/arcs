#!/bin/sh
# target
mkdir dist
# sources
cp -fR source/index.html dist/
# worker build
cp -fR ../../../lib/build/worker.js dist/
# particles
mkdir dist/particles
#
mkdir dist/particles/Common
cp -fR ../../../../particles/Common/Description.schema dist/particles/Common
#
mkdir dist/particles/Pipes
cp -fR ../../../../particles/Pipes/* dist/particles/Pipes
#
mkdir dist/particles/PipeApps
cp -fR ../../../../particles/PipeApps/* dist/particles/PipeApps
# collate sources
echo packing...
npx webpack
echo done.

