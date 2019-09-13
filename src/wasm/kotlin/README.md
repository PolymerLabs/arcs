# Kotlin --> WASM particles

## Build & Test
1. [`npm install && ./tools/sigh webpack`](../../../README.md#install)
1. `cd src/wasm/kotlin`
1. `./gradlew build`
1. `npm start`
1. Visit [localhost:8786/shells/dev-shell/?m=https://$arcs/src/wasm/kotlin/wasm.arcs](http://localhost:8786/shells/dev-shell/?m=https://$arcs/src/wasm/kotlin/wasm.arcs)

## Converting Arcs Schemas to Kotlin
1. Run `$path-to-sigh/sigh schema2pkg -k $path-from-arcs-folder-to-manifest-file -f $path-from-arcs-folder-to-output-file`
1. The Kotlin file should be in the output file you specified above.
