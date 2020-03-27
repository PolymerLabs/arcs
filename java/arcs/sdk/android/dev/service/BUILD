load("//tools/build_defs/android:rules.bzl", "android_library")

package(default_visibility = [
    "//java/arcs:__subpackages__",
    "//javatests/arcs:__subpackages__",
])

licenses(["notice"])

android_library(
    name = "service",
    srcs = glob(["*.java"]),
    assets = [
        "//third_party/javascript/arcs:pipes-shell-assets",
    ],
    assets_dir = "",
    exports_manifest = 1,
    javacopts = ["-Xep:AndroidJdkLibsChecker:OFF"],
    manifest = "AndroidManifest.xml",
    resource_files = glob(["res/**"]),
    deps = [
        ":aidl",
        "//java/arcs/sdk/android/dev/api:api-android",
        "//third_party/java/androidx/webkit",
        "//third_party/java/auto:auto_value",
        "//third_party/java/dagger",
        "//third_party/java/flogger:android",
        "//third_party/java/jsr330_inject",
    ],
)

android_library(
    name = "aidl",
    idl_srcs = glob(["*.aidl"]),
)
