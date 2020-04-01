load("//tools/build_defs/android:rules.bzl", "android_binary")
load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_android_library(
    name = "arcs_e2e_test_lib",
    testonly = 1,
    srcs = glob(["*.kt"]),
    deps = [
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/android/androidx_test/runner",
        "//third_party/android/androidx_test/uiautomator",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
    ],
)

android_binary(
    name = "e2e",
    dexopts = ["--min-sdk-version=29"],
    incremental_dexing = 0,
    instruments = "//javatests/arcs/android/e2e/testapp",
    manifest = "AndroidManifest.xml",
    multidex = "native",
    tags = ["no-cache"],
    deps = [":arcs_e2e_test_lib"],
)
