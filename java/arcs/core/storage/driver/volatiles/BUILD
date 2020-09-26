load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_library(
    name = "volatiles",
    srcs = [
        "VolatileDriver.kt",
        "VolatileEntry.kt",
        "VolatileMemory.kt",
    ],
    visibility = [
        "//java/arcs/core/storage/driver:__subpackages__",
        "//javatests/arcs:__subpackages__",
    ],
    deps = [
        "//java/arcs/core/storage:driver",
        "//java/arcs/core/storage:storage_key",
    ],
)

arcs_kt_library(
    name = "volatile_impl",
    srcs = [
        "VolatileDriverImpl.kt",
        "VolatileMemoryImpl.kt",
    ],
    visibility = [
        "//java/arcs/core/storage/driver:__subpackages__",
        "//javatests/arcs:__subpackages__",
    ],
    deps = [
        ":volatiles",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/util",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
