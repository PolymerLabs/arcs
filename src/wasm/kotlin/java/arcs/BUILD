load("//third_party/bazel_rules/rules_kotlin/kotlin/native:native_rules.bzl", "kt_native_library")
load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

licenses(["notice"])
KOTLINC_OPTS = ["-Xmulti-platform", "-Xuse-experimental=kotlin.ExperimentalMultiplatform"]

kt_jvm_library(
    name = "arcs",
    srcs = glob(["*.kt", "jvm/**/*.kt"]),
    visibility = ["//visibility:public"],
    kotlincopts = KOTLINC_OPTS,
)

kt_native_library(
    name = "arcs_wasm",
    srcs = glob(["*.kt", "**/wasm/*.kt"]),
    visibility = ["//visibility:public"],
    kotlincopts = KOTLINC_OPTS,
)
