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
        "//java/arcs/android/api",
        "//java/arcs/android/impl",
        "//java/arcs/android/client",
        "//java/arcs/android/demo/service",
        "//java/arcs/api:api-android",
        "@com_google_dagger",
        "@flogger//jar",
        "@flogger_system_backend//jar",
        "@javax_inject_source//jar",
    ],
)
