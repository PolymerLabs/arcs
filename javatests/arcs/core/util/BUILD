load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

PERFORMANCE_SRCS = [
    "Base64PerformanceTest.kt",
]

arcs_kt_jvm_test_suite(
    name = "util",
    srcs = glob(
        ["*.kt"],
        exclude = PERFORMANCE_SRCS,
    ),
    package = "arcs.util",
    deps = [
        "//src_kt/java/arcs/testutil",
        "//src_kt/java/arcs/util",
        "//third_party/java/junit",
        "//third_party/java/truth",
        "//third_party/kotlin/kotlinx/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)

arcs_kt_jvm_test_suite(
    name = "util_performance",
    srcs = PERFORMANCE_SRCS,
    package = "arcs.util",
    # Disabled due to unreliable performance characteristics.
    tags = [
        "manual",
        "notap",
    ],
    deps = [
        "//src_kt/java/arcs/util",
        "//third_party/java/junit",
        "//third_party/java/truth",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines",
    ],
)
