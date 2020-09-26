load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")
load("//tools/build_defs/android:rules.bzl", "android_library")

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

android_library(
    name = "aidl",
    testonly = True,
    idl_srcs = glob(["*.aidl"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
)

arcs_kt_android_library(
    name = "devtools",
    testonly = True,
    srcs = glob([
        "*.kt",
    ]),
    manifest = "AndroidManifest.xml",
    resource_files = glob(["res/**/*"]),
    deps = [
        ":aidl",
        "//java/arcs/android/devtools/storage:devtools",
        "//java/arcs/android/storage",
        "//java/arcs/android/storage/service",
        "//java/arcs/android/storage/service:aidl",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/storage:proxy",
        "//java/arcs/core/storage:reference",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/util",
        "//java/arcs/sdk/android/storage/service",
        "//third_party/java/nanohttpd",
        "//third_party/java/nanohttpd:nanohttpd_websocket",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
