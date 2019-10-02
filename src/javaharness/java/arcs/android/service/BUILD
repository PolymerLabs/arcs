package(default_visibility = [
    "//java/arcs/android:__subpackages__",
    "//javatests/arcs/android/service:__subpackages__",
])

licenses(["notice"])

load("@build_bazel_rules_android//android:rules.bzl", "android_binary", "android_library")

android_library(
    name = "service",
    srcs = glob(["*.java"]),
    manifest = "AndroidManifest.xml",
    resource_files = glob(["res/**"]),
    deps = [
        "//java/arcs/android/api",
        "//java/arcs/android/impl",
        "//java/arcs/api:api-android",
        "@com_google_dagger",
        "@flogger//jar",
        "@flogger_system_backend//jar",
        "@javax_inject_source//jar",
    ],
)
