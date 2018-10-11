#!/bin/sh
clear
node --no-warnings --experimental-modules --loader ../../tools/custom-loader.mjs index.js "$@"
