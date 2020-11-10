#!/bin/sh
node --experimental-modules --loader ../tools/custom-loader.mjs ../build/tools/dev_server/dev-server.js &
../node_modules/.bin/wdio ./tests/wdio.conf.js --baseUrl http://localhost #:8786 #< /dev/null

