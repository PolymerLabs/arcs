load("//third_party/bazel_rules/rules_kotlin/kotlin/native:native_rules.bzl", "kt_native_library")
load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_jvm_library")

licenses(["notice"])

KOTLINC_OPTS = [
    "-Xmulti-platform",
    "-Xuse-experimental=kotlin.ExperimentalMultiplatform",
]

arcs_kt_jvm_library(
    name = "arcs",
    srcs = glob([
        "*.kt",
        "**/addressable/*.kt",
        "**/jvm/*.kt",
    ]),
    kotlincopts = KOTLINC_OPTS + ["-Xallow-kotlin-package"],
    visibility = ["//visibility:public"],
)

kt_native_library(
    name = "arcs-wasm",
    srcs = glob(
        [
            "*.kt",
            "**/addressable/*.kt",
            "**/wasm/*.kt",
        ],
    ),
    kotlincopts = KOTLINC_OPTS + ["-Xinline-classes"],
    visibility = ["//visibility:public"],
)
