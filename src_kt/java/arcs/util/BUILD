package(default_visibility = ["//visibility:public"])

load("//third_party/java/arcs/build_defs:build_defs.bzl", "kt_jvm_and_js_library")

kt_jvm_and_js_library(
    name = "util",
    srcs = glob(["*.kt"]),
    deps = [
        "//third_party/kotlin/kotlinx/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines",
    ],
)
