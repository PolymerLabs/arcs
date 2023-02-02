load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

DRIVER_SRCS = [
    "Driver.kt",
    "DriverFactory.kt",
    "DriverProvider.kt",
]

EXTERNAL_STORAGE_OPS_SRCS = [
    "ExternalStorageOps.kt",
]

PROXY_SRCS = [
    "ProxyInterface.kt",
]

STORE_SRCS = [
    "StoreInterface.kt",
]

STORAGE_KEY_SRCS = [
    "StorageKey.kt",
    "StorageKeyParser.kt",
    "StorageKeyProtocol.kt",
    "StorageKeyManagerImpl.kt",
    "StorageKeyUtils.kt",
]

REFERENCE_SRCS = [
    "RawReference.kt",
]

WRITEBACK_SRCS = [
    "StoreWriteBack.kt",
    "WriteBack.kt",
]

arcs_kt_library(
    name = "storage",
    srcs = glob(
        ["*.kt"],
        exclude = PROXY_SRCS + STORAGE_KEY_SRCS + REFERENCE_SRCS + WRITEBACK_SRCS + STORE_SRCS + EXTERNAL_STORAGE_OPS_SRCS + DRIVER_SRCS,
    ),
    exports = [
        ":driver",
        ":proxy",
        ":reference",
        ":storage_key",
        ":store",
        ":writeback",
    ],
    deps = [
        ":driver",
        ":proxy",
        ":reference",
        ":storage_key",
        ":store",
        ":writeback",
        "//java/arcs/core/analytics",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/data:rawentity",  # buildcleaner: keep
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/util",
        "//java/arcs/core/type",
        "//java/arcs/core/util",
        "//java/arcs/core/util:utils-platform-dependencies",
        "//java/arcs/flags",
        "//java/arcs/jvm/util",
        "//third_party/java/androidx/annotation",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

arcs_kt_library(
    name = "driver",
    srcs = DRIVER_SRCS,
    deps = [
        ":external_storage_ops",
        ":storage_key",
        "//java/arcs/core/crdt",
        "//java/arcs/core/type",
    ],
)

arcs_kt_library(
    name = "external_storage_ops",
    srcs = EXTERNAL_STORAGE_OPS_SRCS,
    deps = [
    ],
)

arcs_kt_library(
    name = "storage_key",
    srcs = STORAGE_KEY_SRCS,
    deps = [
        "//java/arcs/flags",
    ],
)

arcs_kt_library(
    name = "reference",
    srcs = REFERENCE_SRCS,
    deps = [
        ":storage_key",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/util",
    ],
)

arcs_kt_library(
    name = "proxy",
    srcs = PROXY_SRCS,
    deps = ["//java/arcs/core/crdt"],
)

arcs_kt_library(
    name = "store",
    srcs = STORE_SRCS,
    deps = [
        ":storage_key",
        "//java/arcs/core/crdt",
        "//java/arcs/core/type",
    ],
)

arcs_kt_library(
    name = "writeback",
    srcs = WRITEBACK_SRCS,
    deps = [
        ":storage_key",
        "//java/arcs/core/util",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
