# C++ --> WASM particles

## Setup

This is only required once per checkout.

- `tools/sigh install emsdk-npm`

## Build

See [here](particles/WasmTemplate) for a working example.

- Define a manifest file with the particle spec referencing a `.wasm` module
- Write your C++ particle(s)
  - #include <arcs.h> and the schema2packager-generated header(s)
  - Particles inherit from arcs::Particle and use arcs::Singleton and arcs::Collection
- Create a `wasm.json` file to set up the sigh-based build:

  ```json5
  {
    "module.wasm": {               // output filename for the compiled wasm module
      "manifest": "example.arcs",  // manifest file; defines the recipe, particle spec and schemas
      "src": ["example.cc", ...],  // source files
      "outDir": "$here"            // location of wasm module and schema2packager output
    }
  }
  ```

- `tools/sigh wasm particles/WasmTemplate/wasm.json`

## Execute

- `npm start`
- Visit [localhost:8786/shells/dev-shell/?m=https://$arcs/particles/WasmTemplate/example.arcs](http://localhost:8786/shells/dev-shell/?m=https://$arcs/particles/WasmTemplate/example.arcs)
