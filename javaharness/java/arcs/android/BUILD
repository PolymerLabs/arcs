package(default_visibility = [
    "//javaharness/java/arcs:__subpackages__",
    "//javaharness/javatests/arcs:__subpackages__",
])

licenses(["notice"])

load("@build_bazel_rules_android//android:rules.bzl", "android_library")

android_library(
    name = "android",
    srcs = glob(["*.java"]),
    assets = [
        "//third_party/javascript/arcs:pipes-shell-assets",
    ],
    assets_dir = "pipes_shell_web_dist",
    exports_manifest = 1,
    idl_import_root = ".",
    idl_srcs = glob(["*.aidl"]),
    javacopts = ["-Xep:AndroidJdkLibsChecker:OFF"],
    manifest = "AndroidManifest.xml",
    resource_files = glob(["res/**"]),
    deps = [
        "//third_party/java/auto:auto_value",
        "//javaharness/java/arcs/api:api-android",
        "//third_party/java/dagger",
        "//third_party/java/flogger",
        "//third_party/java/jsr330_inject",
    ],
)
