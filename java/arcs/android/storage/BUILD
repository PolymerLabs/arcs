load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")
load(
    "//third_party/java/arcs/build_defs:native.oss.bzl",
    "android_proto_library",
    "proto_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_library(
    name = "storage",
    srcs = glob(["*.kt"]),
    idl_parcelables = glob(["*.aidl"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    deps = [
        ":proxy_message_android_proto",
        "//java/arcs/android/crdt",
        "//java/arcs/android/type",
        "//java/arcs/android/util",
        "//java/arcs/core/crdt",
        "//java/arcs/core/storage",
        "//java/arcs/core/type",
        "//third_party/java/androidx/annotation",
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
