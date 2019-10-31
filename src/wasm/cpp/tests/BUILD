load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_cc_schema", "arcs_ts_test")
load("//third_party/java/arcs/build_defs/emscripten:build_defs.bzl", "cc_wasm_binary")

filegroup(
    name = "schemas_srcs",
    srcs = ["schemas.arcs"],
    visibility = ["//visibility:public"],
)

arcs_cc_schema(
    name = "schemas",
    src = "schemas.arcs",
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
    deps = ["//src/wasm/cpp:arcs"],
    visibility = ["//visibility:public"],
)

