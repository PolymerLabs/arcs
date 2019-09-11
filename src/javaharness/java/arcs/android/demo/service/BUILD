package(default_visibility = [
    "//java/arcs/android/demo:__subpackages__",
    "//javatests/arcs/android/demo:__subpackages__",
])

licenses(["notice"])

load("@build_bazel_rules_android//android:rules.bzl", "android_binary", "android_library")

android_library(
    name = "service",
    srcs = glob(["*.java"]),
    manifest = "AndroidManifest.xml",
    resource_files = glob(["res/**"]),
    deps = [
        "//java/arcs/android/demo/api",
        "//java/arcs/android/impl",
        "//java/arcs/api:api-android",
        "//java/arcs/demo/particles:particles-android",
        "//java/arcs/demo/services:services-android",
        "//java/arcs/demo/ui:ui-android",
        "@com_google_dagger",
        "@flogger//jar",
        "@flogger_system_backend//jar",
        "@javax_inject_source//jar",
    ],
)
