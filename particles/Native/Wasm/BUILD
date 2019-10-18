load("//build_defs/kotlin_native:build_defs.bzl", "kt_wasm_binary", "kt_wasm_library")
load("//build_defs/emscripten:build_defs.bzl", "cc_wasm_binary")
load("//build_defs:build_defs.bzl", "arcs_kt_particle", "arcs_kt_schema", "arcs_cc_schema", "arcs_ts_test")

licenses(["notice"])

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
)

arcs_kt_particle(
    name = "service_particle",
    srcs = ["source/ServiceParticle.kt"],
)

arcs_kt_particle(
    name = "test_particle",
    srcs = ["source/TestParticle.kt"],
    deps = [":wasm_schemas"],
)
