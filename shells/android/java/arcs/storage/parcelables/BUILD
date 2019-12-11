licenses(["notice"])

package(default_visibility = ["//visibility:public"])

load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

kt_android_library(
    name = "parcelables",
    srcs = glob(["*.kt"]),
    idl_parcelables = glob(["*.aidl"]),
    manifest = "//shells/android/java/arcs/common:AndroidManifest.xml",
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/crdt/internal",
        "//java/arcs/core/storage",
        "//java/arcs/core/type",
        "//shells/android/java/arcs/crdt/parcelables",
        "//shells/android/java/arcs/type/parcelables",
    ],
)
