load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_library(
    name = "util",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        # TODO: should we move VersionMap to the top-level crdt package if it's being used here?
        "//java/arcs/core/crdt/internal",
        "//java/arcs/core/storage:proxy",
        "//java/arcs/core/storage:reference",
        "//java/arcs/core/storage/referencemode",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
