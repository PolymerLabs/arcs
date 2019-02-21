#!/bin/sh
# target
mkdir dist
# particles
mkdir dist/particles
mkdir dist/particles/Apps
mkdir dist/particles/Arcs
mkdir dist/particles/Glitch
mkdir dist/particles/Pipes
cp -rf ../../particles/Apps/* dist/particles/Apps
cp -rf ../../particles/Arcs/* dist/particles/Arcs
cp -rf ../../particles/Glitch/* dist/particles/Glitch
cp -rf ../../particles/Pipes/* dist/particles/Pipes
# worker build
cp -rf ../lib/build/worker.js dist/
# collate sources
npx webpack
