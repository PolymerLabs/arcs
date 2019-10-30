package(default_visibility = ["//visibility:public"])

load("//third_party/java/arcs/build_defs:build_defs.bzl", "kt_jvm_and_js_library")

kt_jvm_and_js_library(
    name = "util",
    srcs = glob(["*.kt"]),
    deps = [
        "//src_kt/java/arcs/common",
        # TODO: should we move VersionMap to the top-level crdt package if it's being used here?
        "//src_kt/java/arcs/crdt/internal",
        "//third_party/kotlin/kotlinx/kotlinx_atomicfu"
    ]
)
