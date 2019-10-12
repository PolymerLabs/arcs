package(default_visibility = ["//visibility:public"])

load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kt_jvm_library")

kt_jvm_library(
    name = "AllTests-lib",
    srcs = glob(["*.kt"]),
    deps = [
        "@maven//:junit_junit"
    ]
)
