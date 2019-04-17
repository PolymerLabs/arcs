#!/bin/sh
node --experimental-modules --loader ../../tools/custom-loader.mjs index.js "$@"
