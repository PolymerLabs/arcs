# Kotlin --> WASM particles

## Build & Test
0. Make sure the project is [setup](../../../README.md#install)!
1. `bazel build particles/Native/Wasm:all`
2. `npm start`
3. Visit [localhost:8786/shells/dev-shell/?m=https://$particles/Native/Wasm/wasm.arcs](http://localhost:8786/shells/dev-shell/?m=https://$particles/Native/Wasm/wasm.arcs)

## Converting Arcs Schemas to Kotlin
Subject to change
1. Run `$path-to-sigh/sigh schema2pkg -k $path-from-arcs-folder-to-manifest-file -f $path-from-arcs-folder-to-output-file`
1. The Kotlin file should be in the output file you specified above.
