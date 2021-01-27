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
        "//java/arcs/core/host",
        "//java/arcs/core/host/api",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
        "//java/arcs/jvm/host",
        "//java/arcs/sdk",
        "//javatests/arcs/core/host:testhost",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
