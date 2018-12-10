#!/bin/sh
node --inspect-brk --experimental-modules --loader ../../tools/custom-loader.mjs index.js "$@"
