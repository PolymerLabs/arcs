load("//build_defs:build_defs.bzl", "arcs_cc_schema", "arcs_ts_test")
load("//build_defs/emscripten:build_defs.bzl", "cc_wasm_binary")

arcs_cc_schema(
    name = "example_schema",
    src = "example.arcs",
    out = "example.h",
)

cc_wasm_binary(
    name = "example_particle",
    srcs = ["example.cc"],
    hdrs = ["example.h"],
    deps = ["//src/wasm/cpp:arcs"],
)
