#!/bin/sh
# node --no-warnings --experimental-modules --loader ../../../tools/custom-loader.mjs ./node.js "$@"
node --experimental-modules --loader ../../../tools/custom-loader.mjs ./node.js "$@"
