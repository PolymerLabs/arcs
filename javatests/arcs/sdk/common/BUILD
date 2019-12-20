load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_jvm_test_suite")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_test_suite(
    name = "stringEncoder",
    package = "arcs.sdk.kotlin",
    deps = [
        "//java/arcs/sdk/kotlin:arcs",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)

