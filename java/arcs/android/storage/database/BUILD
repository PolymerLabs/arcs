load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_library(
    name = "database",
    srcs = glob(["*.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    deps = [
        "//java/arcs/android/common",  # buildcleaner: keep
        "//java/arcs/android/crdt",
        "//java/arcs/android/crdt:version_map_android_proto",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/entity",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/database",
        "//java/arcs/core/type",
        "//java/arcs/core/util",
        "//java/arcs/core/util/performance",
        "//java/arcs/jvm/util",
        "//third_party/java/androidx/annotation",
        "//third_party/java/arcs/deps:protobuf_javalite",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
