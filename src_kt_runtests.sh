#!/bin/bash

cd src_kt
bazel test --noshow_progress --noshow_loading_progress --test_output=errors --incompatible_depset_is_not_iterable=false //javatests/...
cd -
