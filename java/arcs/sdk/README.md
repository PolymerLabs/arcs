# Arcs SDK 

## Build the SDK

- Android: TBD
- Jvm: `./tools/bazelisk build //java/arcs/sdk`
- Wasm: `./tools/bazelisk build //java/arcs/sdk:sdk-wasm`

## Test the SDK

- Android: TBD
- Jvm: `./tools/bazelisk test //javatests/arcs/sdk/...`
- Wasm: `./tools/bazelisk test //src/wasm:wasm-api-test`

## Creating Kotlin Particles

See [this](../../../particles/Native/Wasm) or [this](../../../particles/Tutorial/Kotlin) for working examples.

- Add a `BUILD` file in the relevant directory
- Generate Kotlin entities from your particle spec using the `arcs_kt_schema` build rule:
  ```
  arcs_kt_schema(
      # Name of the BUILD rule (tell Bazel to build this schema using this name).
      name = "example_schema",
      # Input source.
      src = "example.arcs",
  )
  ```
- Write your Kotlin particle(s): See [this Kotlin tutorial](../../../particles/Tutorial/Kotlin) for greater detail.
- Add a `arcs_kt_particles` rule to the `BUILD` file.
  ```
  # This library is optional, you might not need one if you only have particle files.
  arcs_kt_library(
      # Name of the BUILD rule (tell Bazel to build this particle using this name).
      name = "example_lib",
      # Input Kotlin particle source files to compile.
      srcs = ["MyLib.kt"],
      # Specify the Bazel rule visibility
      visibility = ["//visibility:public"],
      # Other Kotlin dependencies this library depends on (for example, the generated schemas).
      deps = [":example_schema"],
  )

  arcs_kt_particles(
      name = "example_particles",
      # Specify Kotlin particle srcs.
      srcs = ["MyParticle.kt"],
      # Specify the Bazel rule visibility
      visibility = ["//visibility:public"],
      # Other Kotlin dependencies this binary depends on (for example, the compiled library).
      deps = [":example_lib"],
  )
  ```
- Build your particle using Bazel: `./tools/bazelisk build //particles/path/to/BUILD/file:example_particle`.


## Execute

- `tools/sigh devServer`
- Visit [localhost:8786/shells/dev-shell/?m=https://$particles/Native/Wasm/wasm.arcs](http://localhost:8786/shells/dev-shell/?m=https://$particles/Native/Wasm/wasm.arcs) to view your particle in the WebShell.


