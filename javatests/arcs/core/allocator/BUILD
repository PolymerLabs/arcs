load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_test_suite(
    name = "allocator",
    srcs = glob(["*Test.kt"]),
    package = "arcs.core.allocator",
    deps = [
        ":util",
        "//java/arcs/core/allocator",  # buildcleaner: keep
        "//java/arcs/core/common",
        "//java/arcs/core/data",
        "//java/arcs/core/host",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/testutil",
        "//java/arcs/jvm/host",
        "//java/arcs/sdk",
        "//javatests/arcs/core/host",
        "//javatests/arcs/core/host:particle",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)

arcs_kt_jvm_library(
    name = "util",
    testonly = 1,
    srcs = ["TestingHost.kt"],
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/host",
        "//java/arcs/core/storage/api",
        "//java/arcs/jvm/host",
        "//java/arcs/jvm/util/testutil",
        "//java/arcs/sdk",
    ],
)
