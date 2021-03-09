load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_library(
    name = "driver_providers",
    srcs = glob(
        ["*.kt"],
        exclude = ["RamDisk.kt"],
    ),
    deps = [
        ":ramdisk",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage:reference",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/database",
        "//java/arcs/core/storage/driver/volatiles",
        "//java/arcs/core/storage/driver/volatiles:volatile_impl",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/util",
        "//third_party/java/androidx/annotation",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

arcs_kt_library(
    name = "ramdisk",
    srcs = [
        "RamDisk.kt",
    ],
    deps = [
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/driver/volatiles",
        "//java/arcs/core/storage/driver/volatiles:volatile_impl",
        "//third_party/kotlin/kotlinx_atomicfu",
    ],
)

# TODO(jasonwyatt): remove once GitHub e2e is migrated to not use this.
arcs_kt_library(
    name = "driver",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage:reference",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/database",
        "//java/arcs/core/storage/driver/volatiles",
        "//java/arcs/core/storage/driver/volatiles:volatile_impl",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/util",
        "//third_party/java/androidx/annotation",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
