load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_test_suite(
    name = "performance",
    srcs = glob(["*.kt"]),
    package = "arcs.core.util.performance",
    deps = [
        "//java/arcs/core/testutil",
        "//java/arcs/core/util",
        "//java/arcs/core/util/performance",
        "//java/arcs/jvm/util",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)
