load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_library(
    name = "storage",
    srcs = glob(["*.kt"]),
    idl_parcelables = glob(["*.aidl"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    deps = [
        "//java/arcs/android/crdt",
        "//java/arcs/android/type",
        "//java/arcs/core/crdt",
        "//java/arcs/core/storage",
        "//java/arcs/core/type",
        "//third_party/java/androidx/annotation",
    ],
)
