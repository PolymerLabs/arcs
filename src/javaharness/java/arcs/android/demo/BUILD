package(default_visibility = [
    "//java/arcs/demo:__subpackages__",
    "//javatests/arcs/demo:__subpackages__",
])

licenses(["notice"])

load("@build_bazel_rules_android//android:rules.bzl", "android_binary", "android_library")

android_library(
    name = "lib",
    srcs = glob(["**/*.java"]),
    assets = [
        "//java/arcs:pipes-shell-dist",
    ],
    assets_dir = "pipes-shell/web/deploy/dist",
    idl_srcs = [
        "IArcsService.aidl",
    ],
    javacopts = ["-Xep:AndroidJdkLibsChecker:OFF"],
    manifest = "AndroidManifest.xml",
    resource_files = glob(["res/**"]),
    deps = [
        "//java/arcs/android/impl",
        "//java/arcs/api:api-android",
        "//java/arcs/demo/particles:particles-android",
        "//java/arcs/demo/services:services-android",
        "@com_google_dagger",
        "@flogger//jar",
        "@flogger_system_backend//jar",
        "@javax_inject_source//jar",
    ],
)

android_binary(
    name = "app",
    dexopts = [
        "--min-sdk-version=28",
        "--target-sdk-version=28",
    ],
    licenses = ["notice"],
    manifest = "AndroidManifest.xml",
    deps = [":lib"],
)
