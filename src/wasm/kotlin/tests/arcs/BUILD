load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_schema")
load("//third_party/bazel_rules/rules_kotlin/kotlin/native:native_rules.bzl", "kt_native_library", "kt_native_binary")

licenses(["notice"])

filegroup(
  name = "schemas_srcs",
  srcs = ["schemas.arcs"],
  visibility = ["//visibility:public"],
)

arcs_kt_schema(
    name = "test_schemas",
    package = "wasm.kotlin.tests.arcs",
    srcs = ["schemas.arcs"],
)

kt_native_library(
    name = "test-module_lib",
    srcs = glob(["*.kt"]),
    visibility = ["//visibility:public"],
    deps = [":test_schemas"],
)

kt_native_binary(
    name = "test-module",
    visibility = ["//visibility:public"],
    deps = [":test-module_lib"],
)

