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
mkdir dist/particles/Common/schema
cp -fR ../../../../particles/Common/schema/Description.schema dist/particles/Common/schema
#
mkdir dist/particles/PipeApps
cp -fR ../../../../particles/PipeApps/* dist/particles/PipeApps
#
mkdir dist/particles/Music
cp -fR ../../../../particles/Music/* dist/particles/Music
#
mkdir dist/particles/Services
cp -fR ../../../../particles/Services/* dist/particles/Services
#
# collate sources
echo packing...
npx webpack
echo done.

