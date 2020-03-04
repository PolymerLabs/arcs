load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

ENTITY_SRCS = [
    "FieldName.kt",
    "RawEntity.kt",
]

arcs_kt_library(
    name = "data",
    srcs = glob(
        ["*.kt"],
        exclude = ENTITY_SRCS,
    ),
    exports = [
        ":rawentity",
    ],
    deps = [
        ":rawentity",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/type",
        "//java/arcs/core/util",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)

arcs_kt_library(
    name = "rawentity",
    srcs = ENTITY_SRCS,
    deps = [
        "//java/arcs/core/common",
    ],
)
