load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_manifest_bundle",
)
load("//tools/build_defs/android:rules.bzl", "android_binary")

licenses(["notice"])

android_binary(
    name = "demo",
    srcs = glob(["*.java"]),
    assets = [":demo_manifest_bundle"],
    assets_dir = "",
    dexopts = [
        "--min-sdk-version=29",
        "--target-sdk-version=29",
    ],
    javacopts = ["-Xep:AndroidJdkLibsChecker:OFF"],
    licenses = ["notice"],
    manifest = "AndroidManifest.xml",
    resource_files = glob(["res/**"]),
    deps = [
        "//java/arcs/sdk/android/dev/api:api-android",
        "//java/arcs/sdk/android/dev/service",
        "//third_party/java/dagger",
        "//third_party/java/flogger:android",
        "//third_party/java/jsr330_inject",
    ],
)

arcs_manifest_bundle(
    name = "demo_manifest_bundle",
    deps = [
        "//particles/PipeApps:AndroidAutofill",
        "//particles/PipeApps:RenderNotification",
    ],
)
