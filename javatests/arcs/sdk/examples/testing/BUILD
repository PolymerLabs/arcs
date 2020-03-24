load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_jvm_test_suite")

licenses(["notice"])

arcs_kt_jvm_test_suite(
    name = "test",
    package = "arcs.sdk.examples.testing",
    deps = [
        "//java/arcs/sdk",
        "//java/arcs/sdk/examples/testing:codegen",
        "//java/arcs/sdk/examples/testing:codegen_test_harness",
        "//java/arcs/sdk/examples/testing:particle",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)
