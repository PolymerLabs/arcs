package(default_visibility = [
    "//java/arcs:__subpackages__",
    "//javatests/arcs:__subpackages__",
])

licenses(["notice"])

load("@build_bazel_rules_android//android:rules.bzl", "android_binary", "android_library")

android_library(
    name = "impl",
    srcs = glob(["**/*.java"]),
    assets = [
        "//java/arcs:pipes-shell-dist",
    ],
    assets_dir = "pipes-shell/web/deploy/dist",
    manifest = "AndroidManifest.xml",
    deps = [
        "//java/arcs/api:api-android",
        "@com_google_dagger",
        "@flogger//jar",
        "@flogger_system_backend//jar",
        "@javax_inject_source//jar",
    ],
)
