package(default_visibility = [
    "//java/arcs/android/demo:__subpackages__",
    "//javatests/arcs/android/demo:__subpackages__",
])

licenses(["notice"])

load("@build_bazel_rules_android//android:rules.bzl", "android_binary", "android_library")

android_library(
    name = "api",
    idl_srcs = [
        "IArcsService.aidl",
    ],
    manifest = "AndroidManifest.xml",
)
