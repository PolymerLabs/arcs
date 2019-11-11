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
npx webpack --display=errors-only
# Arcs cache manager and versioning
# Must be done at the last step to ensure the correct dist/** checksum
cp -fR ../cache-mgr*.js dist/
sed -i "s/__ARCS_MD5__/$(tar -cf - dist | md5sum | cut -d' ' -f1)/g" \
  dist/cache-mgr-sw.js
