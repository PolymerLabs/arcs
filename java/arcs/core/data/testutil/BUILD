load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

GENERATOR_SRCS = ["Generators.kt"]

arcs_kt_library(
    name = "testutil",
    testonly = True,
    srcs = glob(
        ["*.kt"],
        exclude = GENERATOR_SRCS,
    ),
    deps = [
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data/util:data-util",
        "//third_party/java/truth:truth-android",
    ],
)

arcs_kt_library(
    name = "generators",
    testonly = True,
    srcs = GENERATOR_SRCS,
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/data",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/entity",
        "//java/arcs/core/host",
        "//java/arcs/core/host/testutil:generators",
        "//java/arcs/core/storage:reference",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/testutil",
        "//java/arcs/core/type",
        "//java/arcs/core/util:utils-platform-dependencies",
    ],
)
