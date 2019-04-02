#!/bin/sh
# target
mkdir dist
# sources
cp -fR source/serve.sh dist/
# particles
mkdir dist/particles
mkdir dist/particles/Common
cp -fR ../../../../particles/Common/Description.schema dist/particles/Common
mkdir dist/particles/PipeApps
cp -fR ../../../../particles/PipeApps/* dist/particles/PipeApps
# collate sources
echo packing...
npx webpack
echo done.

