#!/bin/sh

# ibazel installed to local node_modules in install_dependencies.sh
"$(npm bin)/ibazel" run java/arcs:javaharness_dev_server
