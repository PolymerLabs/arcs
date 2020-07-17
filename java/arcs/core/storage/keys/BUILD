load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

PROTOCOL_SRCS = [
    "Protocols.kt",
]

arcs_kt_library(
    name = "protocols",
    srcs = PROTOCOL_SRCS,
)

arcs_kt_library(
    name = "keys",
    srcs = glob(
        ["*.kt"],
        exclude = PROTOCOL_SRCS,
    ),
    deps = [
        ":protocols",
        "//java/arcs/core/common",
        "//java/arcs/core/data",
        "//java/arcs/core/storage",
    ],
)
