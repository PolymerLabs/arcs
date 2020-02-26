load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

STORAGE_KEY_IMPL_SRC = [
    "DatabaseStorageKey.kt",
    "RamDiskStorageKey.kt",
    "VolatileStorageKey.kt",
]

arcs_kt_library(
    name = "driver",
    srcs = glob(
        ["*.kt"],
        exclude = STORAGE_KEY_IMPL_SRC,
    ),
    exports = [":storage_key_impl"],
    deps = [
        ":storage_key_impl",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/crdt/extension",
        "//java/arcs/core/data",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage:reference",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/database",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/util",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

arcs_kt_library(
    name = "storage_key_impl",
    srcs = STORAGE_KEY_IMPL_SRC,
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/storage:storage_key",
    ],
)
