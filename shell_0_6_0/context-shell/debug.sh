#!/bin/sh
node --inspect-brk --no-warnings --experimental-modules --loader ../../tools/custom-loader.mjs index.js "$@"
