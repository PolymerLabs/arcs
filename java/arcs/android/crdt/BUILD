load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")
load(
    "//third_party/java/arcs/build_defs:native.oss.bzl",
    "proto_library",
    "android_proto_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_android_library(
    name = "crdt",
    srcs = glob(["*.kt"]),
    idl_parcelables = glob(["*.aidl"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    deps = [
        ":version_map_android_proto",
        "//java/arcs/android/util",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data/util:data-util",
        "//third_party/java/jsr305_annotations",
    ],
)

proto_library(
    name = "version_map_proto",
    srcs = ["version_map.proto"],
)

android_proto_library(
    name = "version_map_android_proto",
    deps = [":version_map_proto"],
)
