load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_android_library(
    name = "storage",
    srcs = glob(["*.kt"]),
    manifest = "//shells/android/java/arcs/common:AndroidManifest.xml",
    deps = [
        "//shells/android/java/arcs/crdt/parcelables",
        "//shells/android/java/arcs/storage/parcelables",
        "//shells/android/java/arcs/storage/service",
        "//src_kt/java/arcs/common",
        "//src_kt/java/arcs/crdt",
        "//src_kt/java/arcs/crdt/internal",
        "//src_kt/java/arcs/storage",
        "//third_party/java/androidx/lifecycle",
    ],
)
