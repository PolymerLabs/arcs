package(default_visibility = ["//visibility:public"])

load("//third_party/java/arcs/build_defs:build_defs.bzl", "kt_jvm_and_js_library")

kt_jvm_and_js_library(
    name = "crdt",
    srcs = glob(["*.kt"]),
    deps = [
        "//src_kt/java/arcs/common",
        "//src_kt/java/arcs/crdt/internal",
        "//src_kt/java/arcs/data/util",
        "//src_kt/java/arcs/type",
        # This may get unwieldy with avoiding circular deps as entity is implemented. We'll see.
        "//src_kt/java/arcs/data:entity",
    ],
)
