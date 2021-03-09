load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_android_library(
    name = "generators",
    testonly = 1,
    srcs = [
        "Generators.kt",
    ],
    deps = [
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/storage:reference",
        "//java/arcs/core/storage/database",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
    ],
)
