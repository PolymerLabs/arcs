load("@build_bazel_rules_android//android:rules.bzl", "android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

kt_android_library(
    name = "service",
    srcs = glob(["*.kt"]),
    manifest = "AndroidManifest.xml",
    deps = [
        ":aidl",
        "//shells/android/java/arcs/crdt/parcelables",
        "//shells/android/java/arcs/storage/parcelables",
        "//src_kt/java/arcs/common",
        "//src_kt/java/arcs/crdt",
        "//src_kt/java/arcs/crdt/internal",
        "//src_kt/java/arcs/storage",
        "//src_kt/java/arcs/util",
        "//third_party/java/androidx/annotation",
        "//third_party/kotlin/kotlinx/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx/kotlinx_coroutines",
    ],
)

android_library(
    name = "aidl",
    idl_import_root = ".",
    idl_srcs = glob(["*.aidl"]),
    manifest = "//shells/android/java/arcs/common:AndroidManifest.xml",
    deps = [
        "//shells/android/java/arcs/crdt/parcelables",
        "//shells/android/java/arcs/storage/parcelables",
    ],
)
