load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_android_library(
    name = "storage",
    srcs = glob(["*.kt"]),
    idl_parcelables = glob(["*.aidl"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    deps = [
        "//java/arcs/android/crdt",
        "//java/arcs/android/type",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/crdt/internal",
        "//java/arcs/core/data",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/util",
        "//java/arcs/core/type",
    ],
)
