load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_test_suite(
    name = "util",
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.android.util",
    deps = [
        "//java/arcs/android/util",
        "//java/arcs/core/util",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/robolectric",
        "//third_party/java/truth:truth-android",
    ],
)
