package(default_visibility = [
    "//java/arcs/android/demo/app:__subpackages__",
    "//javatests/android/arcs/demo:__subpackages__",
])

licenses(["notice"])

load("@build_bazel_rules_android//android:rules.bzl", "android_library")

android_library(
    name = "ui",
    srcs = glob(["**/*.java"]),
    manifest = "AndroidManifest.xml",
    resource_files = glob(["res/**"]),
    deps = [
        "//java/arcs/android/demo/api",
        "//java/arcs/android/demo/service",
        "@com_google_dagger",
        "@flogger//jar",
        "@flogger_system_backend//jar",
        "@javax_inject_source//jar",
    ],
)
