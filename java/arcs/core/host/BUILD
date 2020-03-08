load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_library", "arcs_kt_schema")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

API_SRCS = [
    "HandleHolder.kt",
    "Particle.kt",
]

arcs_kt_schema(
    name = "schemas",
    srcs = [
        "ArcHostContext.arcs",
    ],
    package = "arcs.core.host",
)

arcs_kt_library(
    name = "api",
    srcs = API_SRCS,
    deps = [
        "//java/arcs/core/storage/api",
    ],
)

arcs_kt_library(
    name = "host",
    srcs = glob(
        ["*.kt"],
        exclude = API_SRCS,
    ),
    deps = [
        ":api",
        ":schemas",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/handle",
        "//java/arcs/core/storage/util",
        "//java/arcs/core/type",
        "//java/arcs/core/util",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
