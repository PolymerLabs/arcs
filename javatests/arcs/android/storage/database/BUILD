load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_test_suite(
    name = "database",
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.android.storage.database",
    deps = [
        "//java/arcs/android/common",  # buildcleaner: keep
        "//java/arcs/android/storage/database",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/storage:reference",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/database",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
        "//third_party/android/androidx_test/core",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/robolectric",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)
