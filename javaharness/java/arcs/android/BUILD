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
        "//shells/pipes-shell:pipes_shell_web",
    ],
    assets_dir = "pipes_shell_web_dist",
    exports_manifest = 1,
    idl_import_root = ".",
    idl_srcs = glob(["*.aidl"]),
    javacopts = ["-Xep:AndroidJdkLibsChecker:OFF"],
    manifest = "AndroidManifest.xml",
    resource_files = glob(["res/**"]),
    deps = [
        "//javaharness:autovalue",
        "//javaharness/java/arcs/android/accelerator",
        "//javaharness/java/arcs/api:api-android",
        "@com_google_dagger",
        "@flogger//jar",
        "@flogger_system_backend//jar",
        "@javax_inject_source//jar",
    ],
)
