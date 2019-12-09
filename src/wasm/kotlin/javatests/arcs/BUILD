load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_binary", "arcs_kt_schema")

licenses(["notice"])

arcs_kt_schema(
    name = "schemas",
    src = "//src/wasm/tests:manifest-srcs",
    out = "Test_GeneratedSchemas.kt",
    package = "sdk.kotlin.javatests.arcs",
)

arcs_kt_binary(
    name = "test-module",
    srcs = glob(["*.kt"]),
    visibility = ["//visibility:public"],
    deps = [":schemas"],
)
