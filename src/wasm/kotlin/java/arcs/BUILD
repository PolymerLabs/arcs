load("//third_party/bazel_rules/rules_kotlin/kotlin/native:native_rules.bzl", "kt_native_library")
load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

licenses(["notice"])

KOTLINC_OPTS = [
    "-Xmulti-platform",
    "-Xuse-experimental=kotlin.ExperimentalMultiplatform",
]

kt_jvm_library(
    name = "arcs",
    srcs = glob(
        ["**/*.kt"],
        exclude = ["wasm/**"],
    ),
    kotlincopts = KOTLINC_OPTS + ["-Xallow-kotlin-package"],
    visibility = ["//visibility:public"],
)

kt_native_library(
    name = "arcs-wasm",
    srcs = glob(
        ["**/*.kt"],
        exclude = ["jvm/**"],
    ),
    kotlincopts = KOTLINC_OPTS,
    visibility = ["//visibility:public"],
)
