load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

SDK_INTERFACES = ["Entity.kt", "Handle.kt"]

arcs_kt_library(
    name = "api",
    srcs = glob(["*.kt"], exclude = SDK_INTERFACES),
    deps = [
        ":api-common",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage:proxy",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/type",
        "//java/arcs/core/util",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

arcs_kt_library(
    name = "api-common",
    srcs = SDK_INTERFACES,
    deps = [
        "//java/arcs/core/data:rawentity",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
