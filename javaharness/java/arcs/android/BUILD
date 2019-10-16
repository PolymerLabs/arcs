package(default_visibility = [
    "//javaharness/java/arcs:__subpackages__",
    "//javaharness/javatests/arcs:__subpackages__",
])

licenses(["notice"])

load("@build_bazel_rules_android//android:rules.bzl", "android_binary", "android_library")

android_library(
    name = "android",
    srcs = glob(["*.java"]),
    resource_files = glob(["res/**"]),
    idl_srcs = glob(["*.aidl"]),
    idl_import_root = ".",
    assets = [
        "//shells/pipes-shell:pipes_shell_web",
    ],
    assets_dir = "pipes_shell_web_dist",
    javacopts = ["-Xep:AndroidJdkLibsChecker:OFF"],
    manifest = "AndroidManifest.xml",
    deps = [
        "//javaharness:autovalue",
        "//javaharness/java/arcs/api:api-android",
        "@com_google_dagger",
        "@flogger//jar",
        "@flogger_system_backend//jar",
        "@javax_inject_source//jar",
    ],
)
