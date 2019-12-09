# Kotlin --> Wasm particles

## Setup 

Our code is built by Bazel. It uses Kotlin Mutliplatform to target JVM and Wasm 
runtimes. Bazel must be installed to build and run the code and tests, which
reside in `src/wasm/`.

1. **Installing Bazel:** Follow [project install instructions](../../../README.md#install).

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
      package = "arcs.example",
  )
  ```
- Write your Kotlin particle(s): See [the Kotlin tutorial](../../../particles/Tutorial/Kotlin) for greater detail.
- To target both Wasm and the JVM, add `arcs_kt_library` and `arcs_kt_binary` to the `BUILD` file.
  ```
  arcs_kt_library(
      # Name of the BUILD rule (tell Bazel to build this particle using this name).
      name = "example_particle-lib",
      # Input Kotlin particle source files to compile.
      srcs = ["Example.kt"],
      # Specify the Bazel rule visibility 
      visibility = ["//visibility:public"],
      # Other Kotlin dependencies this library depends on (for example, the generated schemas).
      deps = [":example_schema"],
  )
  
  arcs_kt_binary(
      name = "example_particle", 
      # Specify other sources to compile (optional)
      srcs = [], 
      # Specify the Bazel rule visibility 
      visibility = ["//visibility:public"],
      # Other Kotlin dependencies this binary depends on (for example, the compiled library).
      deps = [":example_particle-lib"],
  )
  ```
- Build your particle using Bazel: `bazel build //particles/path/to/BUILD/file:example_particle`.


## Execute

- `tools/sigh devServer`
- Visit [localhost:8786/shells/dev-shell/?m=https://$particles/Native/Wasm/wasm.arcs](http://localhost:8786/shells/dev-shell/?m=https://$particles/Native/Wasm/wasm.arcs)


## Test

`bazel test //src/wasm:wasm-api-test`