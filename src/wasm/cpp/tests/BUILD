load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_cc_schema")
load("//third_party/java/arcs/build_defs/emscripten:build_defs.bzl", "cc_wasm_binary")

arcs_cc_schema(
    name = "schemas",
    src = "//src/wasm/tests:manifest.arcs",
    out = "entities.h",
)

cc_wasm_binary(
    name = "test-module",
    srcs = [
        "entity-class-test.cc",
        "particle-api-test.cc",
        "reference-class-test.cc",
        "storage-api-test.cc",
    ],
    hdrs = [
        "entities.h",
        "test-base.h",
    ],
    visibility = ["//visibility:public"],
    deps = ["//src/wasm/cpp:arcs"],
)
