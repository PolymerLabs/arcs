package(default_visibility = ["//visibility:public"])

load("//build_defs:build_defs.bzl", "kt_jvm_and_js_library")

kt_jvm_and_js_library(
    name = "driver",
    srcs = glob(["*.kt"]),
    deps = [
        "//src_kt/java/arcs/common",
        "//src_kt/java/arcs/storage",
        "//src_kt/java/arcs/util",
        "@maven//:org_jetbrains_kotlinx_atomicfu",
    ]
)
