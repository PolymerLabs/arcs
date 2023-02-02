load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_library(
    name = "testutil",
    testonly = True,
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/crdt",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/driver/volatiles",
        "//java/arcs/core/storage/driver/volatiles:volatile_impl",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/type",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
