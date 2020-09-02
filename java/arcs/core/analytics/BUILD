load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_library(
    name = "analytics",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/keys:protocols",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/util",
    ],
)
