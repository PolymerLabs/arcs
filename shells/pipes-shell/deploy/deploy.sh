#!/bin/sh
# target
mkdir dist
# sources
cp -fR source/index.html dist/index.html
cp -fR source/paths.js dist/paths.js
# worker build
cp -fR ../../lib/build/worker.js dist/
# particles
mkdir dist/particles
#
mkdir dist/particles/Apps
cp -fR ../../../particles/Apps/* dist/particles/Apps
#
mkdir dist/particles/Arcs
cp -fR ../../../particles/Arcs/* dist/particles/Arcs
#
mkdir dist/particles/Glitch
cp -fR ../../../particles/Glitch/* dist/particles/Glitch
#
mkdir dist/particles/Pipes
cp -fR ../../../particles/Pipes/* dist/particles/Pipes
#
mkdir dist/particles/PipeApps
cp -fR ../../../particles/PipeApps/* dist/particles/PipeApps
# collate sources
echo packing...
npx webpack | tee packinfo.txt
