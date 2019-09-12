package(default_visibility = [
    "//java/arcs/android:__subpackages__",
    "//javatests/arcs/android:__subpackages__",
])

licenses(["notice"])

load("@build_bazel_rules_android//android:rules.bzl", "android_library")

android_library(
    name = "api",
    srcs = glob(["*.java"]),
    idl_srcs = [
        "IArcsService.aidl",
    ],
)
