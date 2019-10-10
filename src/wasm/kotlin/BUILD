load("//build_defs/kotlin_native:build_defs.bzl", "kt_wasm_library")
load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kt_jvm_library")

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
