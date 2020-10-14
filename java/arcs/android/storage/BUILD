load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")
load(
    "//third_party/java/arcs/build_defs:native.oss.bzl",
    "android_proto_library",
    "proto_library",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_android_library(
    name = "storage",
    srcs = glob(["*.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    deps = [
        ":proxy_message_android_proto",
        ":store_options_android_proto",
        "//java/arcs/android/crdt",
        "//java/arcs/android/type",
        "//java/arcs/android/util",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data/proto",
        "//java/arcs/core/storage",
        "//third_party/java/arcs/deps:protobuf_wrappers_android_proto",
    ],
)

proto_library(
    name = "proxy_message_proto",
    srcs = ["proxy_message.proto"],
    deps = [
        "//java/arcs/android/crdt:crdt_proto",
        "//third_party/java/arcs/deps:protobuf_wrappers_proto",
    ],
)

android_proto_library(
    name = "proxy_message_android_proto",
    deps = [":proxy_message_proto"],
)

proto_library(
    name = "store_options_proto",
    srcs = ["store_options.proto"],
    deps = [
        "//java/arcs/core/data/proto:manifest_proto",
        "//third_party/java/arcs/deps:protobuf_wrappers_proto",
    ],
)

android_proto_library(
    name = "store_options_android_proto",
    deps = [":store_options_proto"],
)
