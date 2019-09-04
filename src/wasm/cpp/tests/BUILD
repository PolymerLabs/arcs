load("//build_defs:build_defs.bzl", "arcs_cc_schema")
load("//build_defs/emscripten:build_defs.bzl", "cc_wasm_binary")

arcs_cc_schema(
    name = "schemas",
    src = "schemas.arcs",
    out = "entities.h",
)

cc_wasm_binary(
    name = "test-module",
    srcs = [
        "entity-class.cc",
        "particle-api.cc",
    ],
    hdrs = ["entities.h"],
    deps = [
        "//src/wasm/cpp:arcs",
    ],
)
