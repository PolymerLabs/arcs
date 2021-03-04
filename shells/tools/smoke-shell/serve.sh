#!/bin/sh
node --no-warnings --experimental-modules --loader ../../../tools/custom-loader.mjs ./smoke.js "$@"
