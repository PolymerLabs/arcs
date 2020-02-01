load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
)
load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_test_suite(
    name = "host",
    srcs = glob(["*Test.kt"]),
    manifest = "AndroidManifest.xml",
    package = "arcs.android.host",
    deps = [
        ":services",
        "//java/arcs/android/host",
        "//java/arcs/core/host",
        "//third_party/android/androidx_test/core",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/mockito:mockito-android",
        "//third_party/java/robolectric",
        "//third_party/java/truth:truth-android",
    ],
)

kt_android_library(
    name = "services",
    testonly = True,
    srcs = glob(
        ["*Service.kt"],
    ),
    deps = [
        "//java/arcs/android/host",
        "//java/arcs/core/host",
        "//java/arcs/core/sdk",
    ],
)
