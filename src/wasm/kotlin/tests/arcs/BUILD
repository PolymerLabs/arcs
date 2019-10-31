load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_schema")
load("//third_party/bazel_rules/rules_kotlin/kotlin/native:native_rules.bzl", "kt_native_binary")

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

kt_native_binary(
    name = "test-module",
    srcs = glob(["*.kt"]),
    deps = [":test_schemas"],
    visibility = ["//visibility:public"],
)
