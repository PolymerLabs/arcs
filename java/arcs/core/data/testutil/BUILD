load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_library(
    name = "generators",
    testonly = 1,
    srcs = [
        "Generators.kt",
    ],
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/entity",
        "//java/arcs/core/host",
        "//java/arcs/core/host/testutil:generators",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/testutil",
        "//java/arcs/core/type",
    ],
)
