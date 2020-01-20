load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_library(
    name = "host",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/sdk",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/driver",
        "//third_party/java/auto:auto_service",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)
