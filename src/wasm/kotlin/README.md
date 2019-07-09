# Kotlin --> WASM particles

## Build & Test
1. [`npm install && ./tools/sigh webpack`](../../../README.md#install)
1. `cd src/wasm/kotlin`
1. `./gradlew build`
1. `npm start`
1. Visit [localhost:8786/shells/dev-shell/?m=https://$arcs/src/wasm/kotlin/wasm.manifest](http://localhost:8786/shells/dev-shell/?m=https://$arcs/src/wasm/kotlin/wasm.manifest)
