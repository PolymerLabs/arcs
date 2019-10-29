package(default_visibility = ["//visibility:public"])

load("//third_party/java/arcs/build_defs:build_defs.bzl", "kt_jvm_and_js_library")

kt_jvm_and_js_library(
    name = "storage",
    srcs = glob(["*.kt"]),
    deps = [
        "//src_kt/java/arcs/crdt",
        "//src_kt/java/arcs/type",
        "//third_party/kotlin/kotlinx/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines",
    ],
)
