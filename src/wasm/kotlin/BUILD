load("//build_defs:build_defs.bzl", "arcs_kt_schema")
load("//tools/build_defs/kotlin/release/rules/native:native_rules.bzl", "kt_native_library", "kt_native_binary")
load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

licenses(["notice"])

kt_jvm_library(
    name = "arcs",
    srcs = glob(["src/arcs/Entity.kt"]),
    visibility = ["//visibility:public"],
)

kt_native_library(
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
