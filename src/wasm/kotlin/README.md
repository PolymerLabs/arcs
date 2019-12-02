# Kotlin --> Wasm particles

## Setup 

Our code is built by Bazel. It uses Kotlin Mutliplatform to target JVM and Wasm 
runtimes. Bazel must be installed to build and run the code and tests, which
reside in `src/wasm/`.

1. **Installing Bazel:** run the `tools/setup` script to install Bazel on Linux
   and MacOS (or otherwise look at that script to see which version of Bazel to 
   download and how to set it up).

## Build

See [here](../../../particles/Native/Wasm) or [here](../../../particles/Tutorial/Kotlin) for working examples.

- Add a `BUILD` file in the relevant directory
- Generate Kotlin Data Classes from your particle spec using the 
  `arcs_kt_schema` build rule:
  ```
  arcs_kt_schema(
      # Name of the BUILD rule (tell Bazel to build this schema using this name).
      name = "example_schema",
      # Input source.
      src = "example.arcs",
      # Optionally, specify package where entities will reside.
      package: "arcs.example",
  )
  ```
- Write your Kotlin particle(s): See [the Kotlin tutorial](../../../particles/Tutorial/Kotlin) for greater detail.
- Add a `wasm_cc_binary` build rule for your C++ particle(s) to your `BUILD`
  file:
  ```
  arcs_kt_binary(
      # Name of the BUILD rule (tell Bazel to build this particle using this name).
      name = "example_particle",
      # Input Kotlin particle source files to compile.
      srcs = ["Example.kt"],
      # Specify the Bazel rule visibility 
      visibility = ["//visibility:public"],
      # Other Kotlin dependencies this binary depends on (for example, the generated schemas).
      deps = [":example_schema"],
  )
  ```
- Build your particle using Bazel: `bazel build //particles/path/to/BUILD/file:example_particle`.


## Execute

- `npm start`
- Visit [localhost:8786/shells/dev-shell/?m=https://$particles/Native/Wasm/wasm.arcs](http://localhost:8786/shells/dev-shell/?m=https://$particles/Native/Wasm/wasm.arcs)


## Test

`bazel test //src/wasm:wasm-api-test`