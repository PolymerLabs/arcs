load("//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_schema",
    "arcs_kt_library",
    "arcs_kt_binary",
)

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

arcs_kt_library(
    name = "test-module_lib",
    srcs = glob(["*.kt"]),
    visibility = ["//visibility:public"],
    deps = [":test_schemas"],
)

arcs_kt_binary(
    name = "test-module",
    visibility = ["//visibility:public"],
    deps = [":test-module_lib"],
)
