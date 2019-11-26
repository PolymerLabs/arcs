package(default_visibility = ["//visibility:public"])

load("//third_party/bazel_rules/rules_kotlin/kotlin/js:js_library.bzl", kt_js_import = "kt_js_import_fixed")
load("//third_party/bazel_rules/rules_kotlin/kotlin/native:native_rules.bzl", "kt_native_library")
load("//:versions.bzl", "KOTLIN_VERSION")

licenses(["notice"])

alias(
    name = "kotlin_test",
    actual = "@maven//:org_jetbrains_kotlin_kotlin_test",
)

kt_native_library(
    name = "kotlin_test-wasm",
    srcs = ["@maven//:org_jetbrains_kotlin_kotlin_test"],
)

kt_js_import(
    name = "kotlin_test-js",
    jars = [
        "@maven//:org_jetbrains_kotlin_kotlin_test_js",
    ],
    srcjar = "kotlin-test-js-{}.jar".format(KOTLIN_VERSION),
)
