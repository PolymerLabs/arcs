#!/bin/sh
# target
mkdir dist
# sources
cp -fR source/index.html dist/index.html
cp -fR source/paths.js dist/paths.js
# particles
mkdir dist/particles
mkdir dist/particles/Apps
mkdir dist/particles/Arcs
mkdir dist/particles/Glitch
mkdir dist/particles/Pipes
cp -fR ../../particles/Apps/* dist/particles/Apps
cp -fR ../../particles/Arcs/* dist/particles/Arcs
cp -fR ../../particles/Glitch/* dist/particles/Glitch
cp -fR ../../particles/Pipes/* dist/particles/Pipes
# worker build
cp -fR ../lib/build/worker.js dist/
# collate sources
npx webpack
