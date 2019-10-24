load("//build_defs:build_defs.bzl", "arcs_cc_schema", "arcs_kt_schema", "arcs_ts_test")
load("//build_defs/emscripten:build_defs.bzl", "cc_wasm_binary")
load("//build_defs/kotlin_native:build_defs.bzl", "kt_wasm_binary", "kt_wasm_library")
load("//src/wasm/cpp/tests:BUILD", "cc_tests", "test_hdr")

filegroup(
  name = "schemas_srcs",
  srcs = ["schemas.arcs"],
  visibility = ["//visibility:public"],
)

arcs_cc_schema(
    name = "schemas_cc",
    src = "schemas.arcs",
    out = "entities.h",
)

cc_wasm_binary(
    name = "test-module",
    srcs = [":cc_tests"],
    hdrs = [
        "entities.h",
        ":test_hdr"
    ],
    deps = ["//src/wasm/cpp:arcs"],
)
