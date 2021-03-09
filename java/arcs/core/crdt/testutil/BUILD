load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

GENERATOR_SRCS = ["Generators.kt"]

arcs_kt_library(
    name = "generators",
    testonly = 1,
    srcs = GENERATOR_SRCS,
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data:data-kt",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/testutil:generators",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/testutil",
    ],
)

arcs_kt_library(
    name = "testutil",
    testonly = True,
    srcs = glob(
        ["*.kt"],
        exclude = GENERATOR_SRCS,
    ),
    deps = [
        "//java/arcs/core/crdt",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data/util:data-util",
    ],
)
