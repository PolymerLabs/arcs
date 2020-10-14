load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_library",
)
load("//tools/build_defs/android:rules.bzl", "android_binary")

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_android_library(
    name = "arcs_e2e_test_lib",
    testonly = True,
    srcs = glob(["*.kt"]),
    deps = [
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/android/androidx_test/runner/monitor",
        "//third_party/android/androidx_test/runner/rules",
        "//third_party/android/androidx_test/uiautomator",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
    ],
)

android_binary(
    name = "e2e",
    testonly = True,
    instruments = "//javatests/arcs/android/e2e/testapp",
    manifest = "AndroidManifest.xml",
    multidex = "native",
    deps = [":arcs_e2e_test_lib"],
)
