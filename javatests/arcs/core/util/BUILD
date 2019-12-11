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
    package = "arcs.core.util",
    deps = [
        "//java/arcs/core/testutil",
        "//java/arcs/core/util",
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
    package = "arcs.core.util",
    # Disabled due to unreliable performance characteristics.
    tags = [
        "manual",
        "notap",
    ],
    deps = [
        "//java/arcs/core/util",
        "//third_party/java/junit",
        "//third_party/java/truth",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines",
    ],
)
