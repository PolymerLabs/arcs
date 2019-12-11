load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "kt_jvm_and_js_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

PROXY_SRCS = [
    "ProxyInterface.kt",
]

STORAGE_KEY_SRCS = [
    "StorageKey.kt",
    "StorageKeyParser.kt",
]

kt_jvm_and_js_library(
    name = "storage",
    srcs = glob(
        ["*.kt"],
        exclude = PROXY_SRCS + STORAGE_KEY_SRCS,
    ),
    exports = [
        ":proxy",
        ":storage_key",
    ],
    deps = [
        ":proxy",
        ":storage_key",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        # TODO: should we move VersionMap to the top-level crdt package if it's being used here?
        "//java/arcs/core/crdt/internal",
        "//java/arcs/core/data",
        "//java/arcs/core/type",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/util",
        "//java/arcs/core/util",
        "//third_party/kotlin/kotlinx/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines",
    ],
)

kt_jvm_and_js_library(
    name = "storage_key",
    srcs = STORAGE_KEY_SRCS,
)

kt_jvm_and_js_library(
    name = "proxy",
    srcs = PROXY_SRCS,
    deps = [
        "//java/arcs/core/crdt",
    ],
)
