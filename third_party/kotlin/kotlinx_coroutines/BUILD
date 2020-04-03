package(default_visibility = ["//visibility:public"])

load("//third_party/bazel_rules/rules_kotlin/kotlin/js:js_library.bzl", kt_js_import = "kt_js_import")

licenses(["notice"])

alias(
    name = "kotlinx_coroutines",
    actual = "@maven//:org_jetbrains_kotlinx_kotlinx_coroutines_core",
)

alias(
    name = "kotlinx_coroutines_android",
    actual = "@maven//:org_jetbrains_kotlinx_kotlinx_coroutines_android",
)

kt_js_import(
    name = "kotlinx_coroutines-js",
#    module_name = "kotlinx-coroutines-core.js",
    jars = [
        "@maven//:org_jetbrains_kotlinx_kotlinx_coroutines_core_js",
    ],
    srcjar = "kotlinx-coroutines-core-js-1.3.4-sources.jar",
)

# Only supported for JVM, since our tests are written with JUnit.
alias(
    name = "kotlinx_coroutines_test",
    actual = "@maven//:org_jetbrains_kotlinx_kotlinx_coroutines_test",
)

#kt_js_import(
#    name = "kotlinx_coroutines_test-js",
#    jars = [
#        "@maven//:org_jetbrains_kotlinx_kotlinx_coroutines_test_js",
#    ],
#    srcjar = "kotlinx-coroutines-test-js-1.3.4-sources.jar",
#)
