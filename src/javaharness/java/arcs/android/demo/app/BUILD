licenses(["notice"])

load("@build_bazel_rules_android//android:rules.bzl", "android_binary")

android_binary(
    name = "app",
    dexopts = [
        "--min-sdk-version=29",
        "--target-sdk-version=29",
    ],
    licenses = ["notice"],
    manifest = "AndroidManifest.xml",
    deps = [
        "//java/arcs/android/demo/service",
        "//java/arcs/android/demo/ui",
    ],
)
