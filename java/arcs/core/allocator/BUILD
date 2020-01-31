load("//third_party/java/arcs/build_defs:build_defs.bzl", "kt_jvm_and_js_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_jvm_and_js_library(
    name = "allocator",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/data",
        "//java/arcs/core/host",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/driver",
        "//java/arcs/sdk",
    ],
)
