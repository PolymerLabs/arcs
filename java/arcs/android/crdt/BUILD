load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")
load(
    "//third_party/java/arcs/build_defs:native.oss.bzl",
    "android_proto_library",
    "proto_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_library(
    name = "crdt",
    srcs = glob(["*.kt"]),
    idl_parcelables = glob(["*.aidl"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    deps = [
        ":crdt_android_proto",
        ":crdt_count_android_proto",
        ":crdt_entity_android_proto",
        ":crdt_exception_android_proto",
        ":crdt_set_android_proto",
        ":crdt_singleton_android_proto",
        ":referencable_android_proto",
        ":version_map_android_proto",
        "//java/arcs/android/util",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/storage:reference",
        "//java/arcs/core/storage:storage_key",
    ],
)

proto_library(
    name = "crdt_proto",
    srcs = ["crdt.proto"],
    deps = [
        ":crdt_count_proto",
        ":crdt_entity_proto",
        ":crdt_set_proto",
        ":crdt_singleton_proto",
    ],
)

android_proto_library(
    name = "crdt_android_proto",
    deps = [":crdt_proto"],
)

proto_library(
    name = "crdt_count_proto",
    srcs = ["crdt_count.proto"],
    deps = [":version_map_proto"],
)

android_proto_library(
    name = "crdt_count_android_proto",
    deps = [":crdt_count_proto"],
)

proto_library(
    name = "crdt_entity_proto",
    srcs = ["crdt_entity.proto"],
    deps = [
        ":crdt_set_proto",
        ":crdt_singleton_proto",
        ":referencable_proto",
        ":version_map_proto",
    ],
)

android_proto_library(
    name = "crdt_entity_android_proto",
    deps = [":crdt_entity_proto"],
)

proto_library(
    name = "crdt_exception_proto",
    srcs = ["crdt_exception.proto"],
)

android_proto_library(
    name = "crdt_exception_android_proto",
    deps = [":crdt_exception_proto"],
)

proto_library(
    name = "crdt_set_proto",
    srcs = ["crdt_set.proto"],
    deps = [
        ":referencable_proto",
        ":version_map_proto",
    ],
)

android_proto_library(
    name = "crdt_set_android_proto",
    deps = [":crdt_set_proto"],
)

proto_library(
    name = "crdt_singleton_proto",
    srcs = ["crdt_singleton.proto"],
    deps = [
        ":crdt_set_proto",
        ":referencable_proto",
        ":version_map_proto",
    ],
)

android_proto_library(
    name = "crdt_singleton_android_proto",
    deps = [":crdt_singleton_proto"],
)

proto_library(
    name = "referencable_proto",
    srcs = ["referencable.proto"],
    deps = [":version_map_proto"],
)

android_proto_library(
    name = "referencable_android_proto",
    deps = [":referencable_proto"],
)

proto_library(
    name = "version_map_proto",
    srcs = ["version_map.proto"],
)

android_proto_library(
    name = "version_map_android_proto",
    deps = [":version_map_proto"],
)
