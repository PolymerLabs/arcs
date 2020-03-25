package(default_visibility = ["//visibility:public"])

load("//third_party/bazel_rules/rules_kotlin/kotlin/js:js_library.bzl", kt_js_import = "kt_js_import_fixed")

licenses(["notice"])

java_library(
    name = "kotlinx_serialization",
    srcs = [],
    exports = [
        ":kotlinx_serialization-common",
        ":kotlinx_serialization-jvm",
    ],
)

alias(
    name = "kotlinx_serialization-common",
    actual = "@maven//:org_jetbrains_kotlinx_kotlinx_serialization_runtime_common",
)

alias(
    name = "kotlinx_serialization-jvm",
    actual = "@maven//:org_jetbrains_kotlinx_kotlinx_serialization_runtime",
)

alias(
    name = "kotlinx_serialization_plugin",
    actual = ":kotlinx-serialization-compiler-plugin.jar",
)
