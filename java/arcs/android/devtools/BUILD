load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")
load("//tools/build_defs/android:rules.bzl", "android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

android_library(
    name = "aidl",
    idl_srcs = glob(["*.aidl"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
)

arcs_kt_android_library(
    name = "devtools",
    srcs = glob([
        "*.kt",
    ]),
    manifest = "AndroidManifest.xml",
    deps = [
        ":aidl",
        "//java/arcs/core/util",
        "//third_party/java/nanohttpd",
        "//third_party/java/nanohttpd:nanohttpd_websocket",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
