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
# OSX needs explicit backup extension for sed command while Linux does not.
# For compatibility, explicitly specify backup file as cache-mgr*.js.tmp
# that gets deleted after patching cache-mgr*.js.
cp -fR ../cache-mgr*.js dist/
CACHE_MGR_VERSION=$(tar cf - dist | shasum | cut -d' ' -f1)
sed -i'.tmp' "s/__ARCS_MD5__/${CACHE_MGR_VERSION}/g" \
  dist/cache-mgr.js
sed -i'.tmp' "s/__ARCS_MD5__/${CACHE_MGR_VERSION}/g" \
  dist/cache-mgr-sw.js
rm -f dist/cache-mgr*.js.tmp
