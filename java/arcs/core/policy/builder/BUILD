load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_library(
    name = "builder",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/data/builder:annotation_builder",
        "//java/arcs/core/data/builder:dsl_annotation",
        "//java/arcs/core/policy",
    ],
)
