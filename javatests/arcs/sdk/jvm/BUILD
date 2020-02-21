load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

TEST_SRCS = glob(["*Test.kt"])

arcs_kt_jvm_test_suite(
    name = "jvm",
    srcs = TEST_SRCS,
    package = "arcs.sdk.jvm",
    deps = [
        ":fakes",
        "//java/arcs/sdk",
        "//third_party/java/junit",
        "//third_party/java/mockito",
        "//third_party/java/truth",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)

arcs_kt_jvm_library(
    name = "fakes",
    srcs = glob(
        ["*.kt"],
        exclude = TEST_SRCS,
    ),
    deps = [
        "//java/arcs/sdk",
    ],
)
