load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
    "arcs_kt_schema",
)

licenses(["notice"])

TEST_SRCS = glob(["*Test.kt"])

arcs_kt_jvm_test_suite(
    name = "spec",
    srcs = TEST_SRCS,
    package = "arcs.sdk.spec",
    deps = [
        ":schemas",
        ":schemas_test_harness",
        "//java/arcs/core/common",
        "//java/arcs/jvm/util/testutil",
        "//java/arcs/sdk",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)

arcs_kt_schema(
    name = "schemas",
    srcs = glob(["*.arcs"]),
)
