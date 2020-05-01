load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

PROTOCL_SRCS = [
    "Protocols.kt",
]

arcs_kt_library(
    name = "protocols",
    srcs = PROTOCL_SRCS,
)

arcs_kt_library(
    name = "keys",
    srcs = glob(
        ["*.kt"],
        exclude = PROTOCL_SRCS,
    ),
    deps = [
        ":protocols",
        "//java/arcs/core/common",
        "//java/arcs/core/data",
        "//java/arcs/core/storage",
    ],
)
