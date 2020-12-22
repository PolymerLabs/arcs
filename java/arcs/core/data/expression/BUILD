load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

PARTICLES_SRC = ["EvaluatorParticle.kt"]

SCOPES_SRC = ["RawEntityScope.kt"]

arcs_kt_library(
    name = "expression",
    srcs = glob(
        ["*.kt"],
        exclude = SCOPES_SRC + PARTICLES_SRC,
    ),
    deps = [
        "//java/arcs/core/util",
        "//java/arcs/core/util:utils-platform-dependencies",
    ],
)

arcs_kt_library(
    name = "particle",
    srcs = PARTICLES_SRC,
    deps = [
        ":expression",
        "//java/arcs/core/analytics",
        "//java/arcs/core/data",
        "//java/arcs/core/host",
        "//java/arcs/core/util",
        "//java/arcs/sdk",
    ],
)

arcs_kt_library(
    name = "scopes",
    srcs = SCOPES_SRC,
    deps = [
        ":expression",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data:reference",
        "//java/arcs/core/data/util:data-util",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
