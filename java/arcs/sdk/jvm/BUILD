load("//third_party/bazel_rules/rules_kotlin/kotlin/native:native_rules.bzl", "kt_native_library")
load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_jvm_library")
load("//java/arcs/sdk/common:variables.bzl", "KOTLINC_OPTS")

licenses(["notice"])


arcs_kt_jvm_library(
    name = "arcs",
    srcs = glob([
        "*.kt",
    ]) + ["//java/arcs/sdk/common:arcs"],
    kotlincopts = KOTLINC_OPTS + ["-Xallow-kotlin-package"],
    visibility = ["//visibility:public"],
)

