load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_binary", "arcs_kt_schema")

licenses(["notice"])

arcs_kt_schema(
    name = "schemas",
    srcs = ["//src/wasm/tests:manifest.arcs"],
    package = "sdk.kotlin.javatests.arcs",
)

arcs_kt_binary(
    name = "test-module",
    srcs = glob(["*.kt"]),
    visibility = ["//visibility:public"],
    deps = [":schemas"],
)
