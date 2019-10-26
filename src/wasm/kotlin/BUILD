load("//third_party/bazel_rules/rules_kotlin/kotlin/native:native_rules.bzl", "kt_native_library")
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
