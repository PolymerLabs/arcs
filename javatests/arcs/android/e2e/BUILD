load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_library",
)
load("//tools/build_defs/android:rules.bzl", "android_binary")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_library(
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
    dexopts = [
        "--min-sdk-version=29",
        "--force-jumbo",
    ],
    incremental_dexing = 0,
    instruments = "//javatests/arcs/android/e2e/testapp",
    manifest = "AndroidManifest.xml",
    multidex = "native",
    deps = [":arcs_e2e_test_lib"],
)
