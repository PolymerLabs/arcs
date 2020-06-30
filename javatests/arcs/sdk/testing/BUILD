load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_jvm_test_suite")

licenses(["notice"])

arcs_kt_jvm_test_suite(
    name = "test",
    package = "arcs.sdk.testing",
    deps = [
        "//java/arcs/core/entity",
        "//java/arcs/core/testutil",
        "//java/arcs/sdk/testing",
        "//javatests/arcs/core/host:particle",
        "//javatests/arcs/core/host:schemas",
        "//javatests/arcs/core/host:schemas_test_harness",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
