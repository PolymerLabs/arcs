package(default_visibility = ["//visibility:public"])

load("//third_party/bazel_rules/rules_kotlin/kotlin/js:js_library.bzl", kt_js_import = "kt_js_import_fixed")

licenses(["notice"])

alias(
    name = "kotlinx_atomicfu",
    actual = "@maven//:org_jetbrains_kotlinx_atomicfu",
)

kt_js_import(
    name = "kotlinx_atomicfu-js",
    jars = [
        "@maven//:org_jetbrains_kotlinx_atomicfu_js",
    ],
    srcjar = "atomicfu-js-0.14.2-sources.jar",
)
