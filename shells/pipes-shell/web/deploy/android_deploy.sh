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
