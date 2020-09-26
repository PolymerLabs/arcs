load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_library(
    name = "api",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/database",
        "//java/arcs/core/storage/driver:driver_providers",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
    ],
)
