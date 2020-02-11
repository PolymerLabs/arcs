load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
)
load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_android_library(
    name = "test_app",
    testonly = 1,
    srcs = ["TestActivity.kt"],
    manifest = ":AndroidManifest.xml",
    deps = [
        "//third_party/java/androidx/appcompat",
    ],
)

arcs_kt_android_test_suite(
    name = "handle",
    srcs = glob(["*Test.kt"]),
    manifest = "AndroidManifest.xml",
    package = "arcs.android.storage.handle",
    deps = [
        ":test_app",
        "//java/arcs/android/crdt",
        "//java/arcs/android/storage",
        "//java/arcs/android/storage/handle",
        "//java/arcs/android/storage/service",
        "//java/arcs/android/storage/service:aidl",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/testutil",
        "//java/arcs/core/type",
        "//java/arcs/sdk/android/storage",
        "//java/arcs/sdk/android/storage/service",
        "//third_party/android/androidx_test/core",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/androidx/appcompat",
        "//third_party/java/androidx/work:testing",
        "//third_party/java/junit:junit-android",
        "//third_party/java/mockito:mockito-android",
        "//third_party/java/robolectric",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
        "//third_party/kotlin/mockito_kotlin:mockito_kotlin-android",
    ],
)
