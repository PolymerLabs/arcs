load("//tools/build_defs/android:rules.bzl", "android_library")
load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_android_library(
    name = "service",
    srcs = glob(["*.kt"]),
    manifest = "AndroidManifest.xml",
    deps = [
        ":aidl",
        "//java/arcs/android/crdt",
        "//java/arcs/android/storage",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/crdt/internal",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/util",
        "//java/arcs/core/util",
        "//third_party/java/androidx/annotation",
        "//third_party/kotlin/kotlinx/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines",
    ],
)

android_library(
    name = "aidl",
    idl_import_root = ".",
    idl_srcs = glob(["*.aidl"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    deps = [
        "//java/arcs/android/crdt",
        "//java/arcs/android/storage",
    ],
)
