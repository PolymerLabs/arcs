load("//build_defs/kotlin_native:build_defs.bzl", "kt_wasm_library", "kt_wasm_binary")
load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kt_jvm_library")
load("//build_defs:build_defs.bzl", "arcs_kt_schema")

licenses(["notice"])

kt_jvm_library(
    name = "arcs",
    srcs = glob(["src/arcs/Entity.kt"]),
    visibility = ["//visibility:public"],
)

kt_wasm_library(
    name = "arcs_wasm",
    srcs = glob(["src/arcs/*.kt"]),
    visibility = ["//visibility:public"],
)

arcs_kt_schema(
    name = "test_schemas",
    srcs = ["tests/arcs/schemas.arcs"],
)

kt_wasm_binary(
    name = "tests_kt",
    srcs = glob(["tests/arcs/*.kt"]),
    deps = [":test_schemas"],
    visibility = ["//visibility:public"],
)
