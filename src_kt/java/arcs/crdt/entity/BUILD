package(default_visibility = ["//visibility:public"])

load("//build_defs:build_defs.bzl", "kt_arcs_library")

kt_arcs_library(
    name = "entity",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/crdt/internal",
        "//java/arcs/util",
    ],
)
