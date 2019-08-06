# C++ --> WASM particles

See [here](particles/WasmTemplate) for a working example.

1. Define a manifest file with the particle spec referencing a `.wasm` module
1. Write your C++ particle(s)
  - #include <arcs.h> and the schema2packager-generated header(s)
  - Particles inherit from arcs::Particle and use arcs::Singleton and arcs::Collection
1. Create a `wasm.json` file to set up the sigh-based build:
```json5
{
  "module.wasm": {                // output filename for the compiled wasm module
    "manifest": "example.arcs",   // manifest file; defines the recipe, particle spec and schemas
    "src": ["example.cc"],        // only a single source file is supported for now
    "outDir": "$here",            // location of wasm module (and schema2packager output)
    "linkManifest": false         // true for unit tests
  }
}
```
1. Run `tools/sigh wasm particles/WasmTemplate/wasm.json`
1. `npm start`
1. Visit [localhost:8786/shells/dev-shell/?m=https://$arcs/particles/WasmTemplate/example.arcs](http://localhost:8786/shells/dev-shell/?m=https://$arcs/particles/WasmTemplate/example.arcs)
