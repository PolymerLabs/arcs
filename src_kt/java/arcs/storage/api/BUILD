package(default_visibility = ["//visibility:public"])

load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

kt_jvm_library(
    name = "api",
    srcs = glob(["*.kt"]),
    deps = [
        "//src_kt/java/arcs/common",
        "//src_kt/java/arcs/crdt",
        "//src_kt/java/arcs/data",
        "//src_kt/java/arcs/data/util",
        "//src_kt/java/arcs/storage",
        "//src_kt/java/arcs/storage:proxy",
        "//src_kt/java/arcs/storage:storage_key",
        "//src_kt/java/arcs/util",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines"
    ],
)
