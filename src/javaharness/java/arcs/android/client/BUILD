package(default_visibility = [
    "//java/arcs/android/demo:__subpackages__",
    "//javatests/arcs/android/demo:__subpackages__",
])

licenses(["notice"])

load("@build_bazel_rules_android//android:rules.bzl", "android_library")

android_library(
    name = "client",
    srcs = glob(["*.java"]),
    deps = [
        "//java/arcs/android/api",
        "//java/arcs/android/impl",
        "//java/arcs/android/service",
        "//java/arcs/api:api-android",
        "@com_google_dagger",
        "@javax_inject_source//jar",
    ],
)
