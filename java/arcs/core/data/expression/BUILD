load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

SCOPES_SRC = ["RawEntityScope.kt"]

arcs_kt_library(
    name = "expression",
    srcs = glob(
        ["*.kt"],
        exclude = SCOPES_SRC,
    ),
    deps = ["//java/arcs/core/util"],
)

arcs_kt_library(
    name = "scopes",
    srcs = SCOPES_SRC,
    deps = [
        ":expression",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data:reference",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/util",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
