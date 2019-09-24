# Kotlin --> WASM particles

## Build & Test
0. Make sure the project is [setup](../../../README.md#install)!
1. `bazel build src/wasm/kotlin:test_harness src/wasm/kotlin:service_particle`
2. `npm start`
3. Visit [localhost:8786/shells/dev-shell/?m=https://$arcs/src/wasm/kotlin/wasm.arcs](http://localhost:8786/shells/dev-shell/?m=https://$arcs/src/wasm/kotlin/wasm.arcs)

## Converting Arcs Schemas to Kotlin
Subject to change
1. Run `$path-to-sigh/sigh schema2pkg -k $path-from-arcs-folder-to-manifest-file -f $path-from-arcs-folder-to-output-file`
1. The Kotlin file should be in the output file you specified above.
