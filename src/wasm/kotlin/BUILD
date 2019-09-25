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
    name = "particle_sdk",
    srcs = glob(["src/arcs/*.kt"]),
    visibility = ["//visibility:public"]
)
