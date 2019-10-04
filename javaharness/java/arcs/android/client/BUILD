package(default_visibility = [
    "//javaharness/java/arcs/android/demo:__subpackages__",
    "//javaharness/javatests/arcs/android/demo:__subpackages__",
])

licenses(["notice"])

load("@build_bazel_rules_android//android:rules.bzl", "android_library")

android_library(
    name = "client",
    srcs = glob(["*.java"]),
    deps = [
        "//javaharness/java/arcs/android/api",
        "//javaharness/java/arcs/android/impl",
        "//javaharness/java/arcs/android/service",
        "//javaharness/java/arcs/api:api-android",
        "@com_google_dagger",
        "@javax_inject_source//jar",
    ],
)
