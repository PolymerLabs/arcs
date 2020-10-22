#!/bin/sh
echo Compiling Typescript
npx tsc
echo Packing worker.js
npx webpack
