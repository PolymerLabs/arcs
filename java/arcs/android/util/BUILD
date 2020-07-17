load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_android_library(
    name = "util",
    srcs = glob(["*.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    deps = [
        "//java/arcs/android/crdt:crdt_android_proto",
        "//java/arcs/android/crdt:crdt_count_android_proto",
        "//java/arcs/android/crdt:crdt_entity_android_proto",
        "//java/arcs/android/crdt:crdt_set_android_proto",
        "//java/arcs/android/crdt:crdt_singleton_android_proto",
        "//java/arcs/android/crdt:referencable_android_proto",
        "//java/arcs/android/crdt:version_map_android_proto",
        "//java/arcs/android/storage:proxy_message_android_proto",
        "//java/arcs/core/util",
        "//java/arcs/core/util/performance",
        "//third_party/java/arcs/deps:protobuf_javalite",
    ],
)
