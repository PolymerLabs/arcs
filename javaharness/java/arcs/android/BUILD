package(default_visibility = [
    "//javaharness/java/arcs:__subpackages__",
    "//javaharness/javatests/arcs:__subpackages__",
])

licenses(["notice"])

load("//tools/build_defs/android:rules.bzl", "android_library")

android_library(
    name = "android",
    srcs = glob(["*.java"]),
    assets = [
        # And example manifest bundle.
        # TODO: Include the actual particles needed by the javaharness app.
        "//particles/Native/Wasm:bundle",
    ],
    assets_dir = "",
    exports_manifest = 1,
    idl_import_root = ".",
    idl_srcs = glob(["*.aidl"]),
    javacopts = ["-Xep:AndroidJdkLibsChecker:OFF"],
    manifest = "AndroidManifest.xml",
    resource_files = glob(["res/**"]),
    deps = [
        ":pipe-shell-assets",
        "//javaharness/java/arcs/api:api-android",
        "//third_party/java/auto:auto_value",
        "//third_party/java/dagger",
        "//third_party/java/flogger:android",
        "//third_party/java/jsr330_inject",
    ],
)

# Combines all of the pipes-shell compiled source into an Android assets folder.
android_library(
    name = "pipe-shell-assets",
    assets = [
        "//third_party/javascript/arcs:pipes-shell-assets",
    ],
    assets_dir = "",
    manifest = "AndroidManifest.xml",
)
