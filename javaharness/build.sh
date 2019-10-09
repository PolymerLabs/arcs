#!/bin/sh
# Run from Arcs repo root directory.

./tools/sigh webpack
(cd shells/pipes-shell/web/deploy && ./deploy.sh)
bazel mobile-install //javaharness/java/arcs/android/demo/app
