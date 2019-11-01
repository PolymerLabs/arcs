package(default_visibility = ["//visibility:public"])

load("//third_party/java/arcs/build_defs:build_defs.bzl", "kt_jvm_and_js_library")

kt_jvm_and_js_library(
    name = "data",
    srcs = glob(["*.kt"]),
    deps = [
        "//src_kt/java/arcs/common",
        "//src_kt/java/arcs/crdt",
        "//src_kt/java/arcs/crdt/internal",
        "//src_kt/java/arcs/type",
    ],
)

kt_jvm_and_js_library(
    name = "entity",
    srcs = [
        "Entity.kt",
        "RawEntity.kt",
    ],
    deps = [
        "//src_kt/java/arcs/common",
    ],
)
