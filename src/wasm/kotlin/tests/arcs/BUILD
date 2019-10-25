load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_schema")
load("//tools/build_defs/kotlin/release/rules/native:native_rules.bzl", "kt_native_binary")

filegroup(
  name = "schemas_srcs",
  srcs = ["schemas.arcs"],
  visibility = ["//visibility:public"],
)

arcs_kt_schema(
    name = "test_schemas",
    srcs = ["schemas.arcs"],
)

kt_native_binary(
    name = "test-module",
    srcs = glob(["*.kt"]),
    deps = [":test_schemas"],
    visibility = ["//visibility:public"],
)
