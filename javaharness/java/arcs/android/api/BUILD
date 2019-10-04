package(default_visibility = [
    "//javaharness/java/arcs:__subpackages__",
    "//javaharness/javatests/arcs:__subpackages__",
])

licenses(["notice"])

load("@build_bazel_rules_android//android:rules.bzl", "android_library")

android_library(
    name = "api",
    srcs = glob(["*.java"]),
    idl_srcs = glob(["*.aidl"]),
    idl_import_root = "."
)
