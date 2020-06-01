load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_library(
    name = "testing",
    testonly = 1,
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/host",
        "//java/arcs/core/util",
        "//java/arcs/jvm/host",
        "//java/arcs/jvm/util",
        "//java/arcs/sdk",
        "//java/arcs/sdk/storage",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)
