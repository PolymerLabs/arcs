#!/bin/sh
# Deploy script for Android. Webpacks the pipes-shell code and copied only the
# essential files into the given folder (command line arg is relative path).
OUT_DIR="$PWD/$1"

# cd to directory containing this script.
cd "${0%/*}"

# Webpack shell code.
npx webpack --display=errors-only --output="$OUT_DIR/shell.js"

# Copy over webpacked Arcs runtime.
cp ../../../lib/build/worker.js "$OUT_DIR/worker.js"

# Copy over shell html.
cp source/index.html "$OUT_DIR/index.html"

# Arcs cache manager and versioning
# Must be done at the last step to ensure the correct $OUT_DIR/** checksum
# OSX needs explicit backup extension for sed command while Linux does not.
# For compatibility, explicitly specify backup file as cache-mgr*.js.tmp
# that gets deleted after patching cache-mgr*.js.
cp -fR ../cache-mgr*.js $OUT_DIR/
CACHE_MGR_VERSION=$(tar cfP - $OUT_DIR | shasum | cut -d' ' -f1)
sed -i'.tmp' "s/__ARCS_MD5__/${CACHE_MGR_VERSION}/g" \
  $OUT_DIR/cache-mgr.js
sed -i'.tmp' "s/__ARCS_MD5__/${CACHE_MGR_VERSION}/g" \
  $OUT_DIR/cache-mgr-sw.js
rm -f $OUT_DIR/cache-mgr*.js.tmp
