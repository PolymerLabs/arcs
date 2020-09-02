load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_library(
    name = "util",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/common",  # buildcleaner: keep
        "//java/arcs/core/crdt",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
