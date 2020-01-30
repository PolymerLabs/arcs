load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_library(
    name = "crdt",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/crdt/internal",
        "//java/arcs/core/data/util",
        "//java/arcs/core/type",
        # This may get unwieldy with avoiding circular deps as entity is implemented. We'll see.
        "//java/arcs/core/data:rawentity",
    ],
)
