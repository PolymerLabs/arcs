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
mkdir dist/particles/Arcs
cp -fR ../../../../particles/Arcs/Description.schema dist/particles/Arcs
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

