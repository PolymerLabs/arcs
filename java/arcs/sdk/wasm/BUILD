load("//third_party/bazel_rules/rules_kotlin/kotlin/native:native_rules.bzl", "kt_native_library")
load("//third_party/java/arcs/build_defs/internal:kotlin.bzl", "KOTLINC_OPTS")

licenses(["notice"])

KOTLINC_OPTS = [
    "-Xmulti-platform",
    "-Xuse-experimental=kotlin.ExperimentalMultiplatform",
]

kt_native_library(
    name = "arcs",
    srcs = glob([
        "*.kt",
    ]) + ["//third_party/java/arcs/sdk/kotlin:kotlin-common"],
    kotlincopts = KOTLINC_OPTS + ["-Xinline-classes"],
    visibility = ["//visibility:public"],
)
