#!/bin/bash

set -e

em++ working.cc -o output.wasm -s "EXPORTED_FUNCTIONS=['_malloc', '_free']" -O3 -std=c++11

if which wasm2wat >/dev/null; then
  wasm2wat output.wasm > output.wat
  grep "^  (import" output.wat
fi
