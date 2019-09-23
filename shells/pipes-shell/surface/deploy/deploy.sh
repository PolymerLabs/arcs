#!/bin/sh
# target
mkdir dist
# sources
cp -f ../* dist/
# collate sources
echo packing...
npx webpack
echo done.

