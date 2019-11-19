licenses(["notice"])

package(default_visibility = ["//visibility:public"])

load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

kt_android_library(
    name = "parcelables",
    srcs = glob(["*.kt"]),
    manifest = "//shells/android/java/arcs/common:AndroidManifest.xml",
    idl_parcelables = glob(["*.aidl"]),
    deps = [
        "//src_kt/java/arcs/common",
        "//src_kt/java/arcs/crdt",
        "//src_kt/java/arcs/crdt/internal",
    ],
)
