load("//build_defs:build_defs.bzl", "arcs_kt_schema")
load("//build_defs/kotlin_native:build_defs.bzl", "kt_wasm_binary", "kt_wasm_library")

# Example for how to generate Kotlin code from a .arcs schema.
# TODO: This is not used anywhere yet. Hook it up to something.
arcs_kt_schema(
    name = "wasm_schemas",
    src = "wasm.arcs",
    out = "schemas.kt",
)

kt_wasm_library(
    name = "particle_interop",
    srcs = glob(["sdk/arcs/*.kt"]),
)

kt_wasm_binary(
    name = "service_particle",
    srcs = ["wasm/arcs/ServiceParticle.kt"],
    entry_point = "arcs.main",
    deps = [":particle_interop"],
)

kt_wasm_binary(
    name = "test_harness",
    srcs = [
        "wasm/arcs/Entities.kt",
        "wasm/arcs/TestParticle.kt",
    ],
    entry_point = "arcs.main",
    deps = [":particle_interop"],
)
