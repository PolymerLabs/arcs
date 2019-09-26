load("//build_defs/kotlin_native:build_defs.bzl", "kt_wasm_binary", "kt_wasm_library")
load("//build_defs/emscripten:build_defs.bzl", "cc_wasm_binary")
load("//build_defs:build_defs.bzl", "arcs_kt_schema", "arcs_cc_schema", "arcs_ts_test")


arcs_cc_schema(
    name = "example_schema",
    src = "example.arcs",
    out = "example.h",
)

cc_wasm_binary(
    name = "example_particle",
    srcs = ["source/example.cc"],
    hdrs = ["example.h"],
    deps = ["//src/wasm/cpp:arcs"],
)

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
