load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")
load("//tools/build_defs/android:rules.bzl", "android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

android_library(
    name = "aidl",
    idl_import_root = ".",
    idl_srcs = glob(["*.aidl"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
)

arcs_kt_android_library(
    name = "service",
    srcs = glob(["*.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    deps = [
        ":aidl",
        "//java/arcs/android/crdt:crdt_exception_android_proto",
        "//java/arcs/android/storage",
        "//java/arcs/android/storage:proxy_message_android_proto",
        "//java/arcs/android/util",
        "//java/arcs/core/crdt",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/util",
        "//java/arcs/core/util",
        "//third_party/java/androidx/annotation",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
