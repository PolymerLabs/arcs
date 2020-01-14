load("//third_party/bazel_rules/rules_kotlin/kotlin/native:native_rules.bzl", "kt_native_library")
load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_jvm_library")
load("//third_party/java/arcs/build_defs/internal:kotlin.bzl", "KOTLINC_OPTS")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_library(
    name = "arcs",
    srcs = glob([
        "*.kt",
        "jvm/*.kt",
    ]),
    kotlincopts = KOTLINC_OPTS + ["-Xallow-kotlin-package"],
    visibility = ["//visibility:public"],
)

kt_native_library(
    name = "arcs-wasm",
    srcs = glob([
        "*.kt",
        "wasm/*.kt",
    ]),
    kotlincopts = KOTLINC_OPTS + ["-Xinline-classes"],
    visibility = ["//visibility:public"],
)

# Special package containing wasm srcs for unit testing (on the JVM).
arcs_kt_jvm_library(
    name = "arcs-wasm-testing",
    testonly = 1,
    srcs = glob(["*.kt"]) + [
        "wasm/Encoding.kt",
        "jvm/JvmUtils.kt",
    ],
    kotlincopts = KOTLINC_OPTS + ["-Xallow-kotlin-package"],
    visibility = ["//javatests/arcs/sdk/wasm:__pkg__"],
)
