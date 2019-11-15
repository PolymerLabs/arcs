licenses(["notice"])

package(default_visibility = ["//visibility:public"])

load("//third_party/java/arcs/build_defs:build_defs.bzl", "kt_jvm_and_js_library")

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
        "//src_kt/java/arcs/common",
        "//src_kt/java/arcs/crdt",
        # TODO: should we move VersionMap to the top-level crdt package if it's being used here?
        "//src_kt/java/arcs/crdt/internal",
        "//src_kt/java/arcs/data",
        "//src_kt/java/arcs/type",
        "//src_kt/java/arcs/storage/referencemode",
        "//src_kt/java/arcs/storage/util",
        "//src_kt/java/arcs/util",
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
        "//src_kt/java/arcs/crdt",
    ],
)
