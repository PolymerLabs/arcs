load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_android_library(
    name = "storage",
    srcs = glob(["*.kt"]),
    manifest = "//shells/android/java/arcs/common:AndroidManifest.xml",
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/crdt/internal",
        "//java/arcs/core/storage",
        "//shells/android/java/arcs/crdt/parcelables",
        "//shells/android/java/arcs/storage/parcelables",
        "//shells/android/java/arcs/storage/service",
        "//third_party/java/androidx/lifecycle",
    ],
)
