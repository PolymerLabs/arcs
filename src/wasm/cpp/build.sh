#!/bin/bash

## This is an internal development tool that is not generally intended for wide use ##

fail() {
  echo "$1" >&2
  exit 1
}

# This script assumes you have emsdk installed and set up for global use.
which em++ >/dev/null || fail "em++ not found; do you need to source emsdk_env.sh?"

# Version check (n.b. the double 'sed' is because Mac OSX sed can't do capture groups)
read A B C <<<$(em++ --version | head -1 | sed 's/^[^0-9.]*//' | sed 's/ .*//' | tr '.' ' ')
V=$(( A * 10**8 + B * 10**4 + C ))
(( V >= 100380034 )) || fail "emscripten must be at least version 1.38.34"

invoke() {
  # export EMCC_DEBUG=1 for debug info
  em++ -s "EXPORTED_FUNCTIONS=['_malloc', '_free']" -s EMIT_EMSCRIPTEN_METADATA \
       -std=c++17 -O3 -Wall -Wextra -Wno-unused-parameter -I. \
       arcs.cc working.cc second.cc -o $1 || fail "em++ failed"
}

echo "Building output.wasm"
invoke output.wasm

# For debugging: generate the .wat file and glue JS code as well as the standard build.
# It is highly recommended that you 'npm install -g js-beautify' to make the glue code readable;
# we want to build it with the same optimisations enabled as for the standard build, but that
# means the resulting JS code is minified and therefore unreadable.
if [[ $1 = --debug ]]; then
  WWCMD=$(which wasm2wat)
  if [[ $WWCMD = "" ]]; then
    # wabt tools should be part of the emsdk installation
    WWCMD="$EMSDK"/fastcomp/bin/wasm2wat
    [[ -x $WWCMD ]] || WWCMD=""
  fi
  if [[ $WWCMD != "" ]]; then
    echo "Generating output.wat"
    "$WWCMD" output.wasm -o output.wat
  else
    echo "wasm2wat command not found; skipping generation of output.wat"
  fi

  echo "Generating glue.js"
  invoke glue.js
  rm glue.wasm
  { which js-beautify && js-beautify -r glue.js; } >/dev/null
fi
