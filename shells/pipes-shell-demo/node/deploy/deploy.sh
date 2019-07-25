#!/bin/sh
# target
mkdir dist
# sources
cp -fR source/serve.sh dist/
# particles
mkdir dist/particles
#
mkdir dist/particles/Common
mkdir dist/particles/Common/schemas
cp -fR ../../../../particles/Common/schemas/Description.schema dist/particles/Common/schemas
#
mkdir dist/particles/PipeApps
cp -fR ../../../../particles/PipeApps/* dist/particles/PipeApps
#
mkdir dist/particles/Music
cp -fR ../../../../particles/Music/* dist/particles/Music
#
# collate sources
echo packing...
npx webpack
echo done.

