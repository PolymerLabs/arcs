load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_library(
    name = "api",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/data:rawentity",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
