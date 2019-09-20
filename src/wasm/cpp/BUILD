load("//build_defs/emscripten:build_defs.bzl", "cc_wasm_library", "cc_wasm_binary")

cc_wasm_library(
    name = "arcs",
    srcs = ["arcs.cc"],
    hdrs = ["arcs.h"],
    visibility = ["//visibility:public"],
)

cc_wasm_binary(
    name = "working",
    srcs = [
        "second.cc",
        "working.cc",
    ],
    hdrs = ["entity-class.h"],
    deps = [":arcs"],
)
