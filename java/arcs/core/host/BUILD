load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_jvm_library(
    name = "host",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/sdk",
        "//third_party/java/auto:auto_service",
    ],
)
