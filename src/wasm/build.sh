#!/bin/bash

set -e

invoke() {
  # export EMCC_DEBUG=1 for debug info
  em++ -s "EXPORTED_FUNCTIONS=['_malloc', '_free']" -s EMIT_EMSCRIPTEN_METADATA \
       -std=c++17 -O3 test-particle.cc -o $1
}

if [[ $1 = -g ]]; then
  # Generate the glue code (useful as a development reference).
  invoke glue.js
  rm glue.wasm
  which js-beautify >/dev/null && js-beautify -r glue.js
  exit
fi

invoke output.wasm

if which wasm2wat >/dev/null; then
  wasm2wat output.wasm -o output.wat
  grep "^  (import" output.wat
fi
