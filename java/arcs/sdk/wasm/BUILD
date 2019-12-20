load("//third_party/bazel_rules/rules_kotlin/kotlin/native:native_rules.bzl", "kt_native_library")
load("//java/arcs/sdk/common:variables.bzl", "KOTLINC_OPTS")

licenses(["notice"])

KOTLINC_OPTS = [
    "-Xmulti-platform",
    "-Xuse-experimental=kotlin.ExperimentalMultiplatform",
]

kt_native_library(
    name = "arcs",
    srcs = glob([
        "*.kt",
    ]) + ["//java/arcs/sdk/common:arcs"],
    kotlincopts = KOTLINC_OPTS + ["-Xinline-classes"],
    visibility = ["//visibility:public"],
)
