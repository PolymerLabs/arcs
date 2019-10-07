package(default_visibility = [
    "//javaharness/java/arcs/android/demo/app:__subpackages__",
    "//javaharness/javatests/android/arcs/demo:__subpackages__",
])

licenses(["notice"])

load("@build_bazel_rules_android//android:rules.bzl", "android_library")

android_library(
    name = "ui",
    srcs = glob(["**/*.java"]),
    manifest = "AndroidManifest.xml",
    resource_files = glob(["res/**"]),
    javacopts = ["-Xep:AndroidJdkLibsChecker:OFF"],
    deps = [
        "//javaharness/java/arcs/android/api",
        "//javaharness/java/arcs/android/impl",
        "//javaharness/java/arcs/android/client",
        "//javaharness/java/arcs/android/demo/service",
        "//javaharness/java/arcs/android/service",
        "//javaharness/java/arcs/api:api-android",
        "@com_google_dagger",
        "@flogger//jar",
        "@flogger_system_backend//jar",
        "@javax_inject_source//jar",
    ],
)
