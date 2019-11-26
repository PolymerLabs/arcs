This folder contains cached wasm binaries for emscripten (C++ wasm compiler).

Caching these standard libraries saves significant amount of time for clean
builds (1-3 min).

These cached libraries shouldn't change, unless we update the version of
emscripten. Instructions for updating emsdk/emscripten are in
`build_defs/emscripten/repo.bzl`.

To update the cache:

1. Delete everything in `emscripten_cache/asmjs`.
2. Update comment out the line that says `rm -rf "$EM_CACHE"` at the bottom of
   `build_defs/emscripten/emsdk_wrapper.sh`
3. Build a C++ wasm binary via `bazel build`.
4. Look at your bazel build output, and find a line that says something like
   `(this will be cached in "/tmp/emscripten-cache-UcBjY7Unpg/is_vanilla.txt`.
5. Copy everything from that tmp folder (e.g.
   `/tmp/emscripten-cache-UcBjY7Unpg`) into the `emscripten_cache` folder in
   your repo. Don't copy the `is_vanilla.txt` file.
6. Check in those new files, and revert the other changes.
