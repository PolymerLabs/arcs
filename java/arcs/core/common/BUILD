load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_library(
    name = "common",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/util",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
