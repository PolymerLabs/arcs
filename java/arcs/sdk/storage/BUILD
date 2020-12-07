load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_java_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

# arcs_kt_library instead of arcs_kt_library because we have no srcs and arcs_kt_library doesn't
# like that.
arcs_java_library(
    name = "storage",
    constraints = ["android"],
    visibility = ["//java/arcs:allowed-packages"],
    exports = [
        "//java/arcs/core/storage:reference",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/driver:driver_providers",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
    ],
)
