load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
)
load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_android_library(
    name = "support",
    testonly = 1,
    srcs = [
        "ClientActivity.kt",
        "ClientService.kt",
    ],
    manifest = "AndroidManifest.xml",
    visibility = ["//visibility:private"],
)

arcs_kt_android_test_suite(
    name = "resurrection",
    srcs = [
        "ResurrectionRequestTest.kt",
    ],
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.android.common.resurrection",
    deps = [
        ":support",
        "//java/arcs/android/common/resurrection",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/testutil",
        "//third_party/android/androidx_test/core",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/android/androidx_test/rules",
        "//third_party/java/junit:junit-android",
        "//third_party/java/mockito:mockito-android",
        "//third_party/java/robolectric",
        "//third_party/java/truth:truth-android",
    ],
)
