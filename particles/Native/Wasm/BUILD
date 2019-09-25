load("//build_defs/kotlin_native:build_defs.bzl", "kt_wasm_binary", "kt_wasm_library")
load("//build_defs:build_defs.bzl", "arcs_kt_schema")

# Example for how to generate Kotlin code from a .arcs schema.
arcs_kt_schema(
    name = "wasm_schemas",
    src = "Harness.arcs",
    out = "Entities.kt",
)

kt_wasm_binary(
    name = "service_particle",
    srcs = ["source/ServiceParticle.kt"],
    entry_point = "arcs.main",
    deps = ["//src/wasm/kotlin:particle_sdk"],
)

kt_wasm_binary(
    name = "test_harness",
    srcs = [
        "source/TestParticle.kt",
        ":wasm_schemas",
    ],
    entry_point = "arcs.main",
    deps = ["//src/wasm/kotlin:particle_sdk"],
)
