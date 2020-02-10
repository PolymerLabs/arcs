load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_test_suite(
    name = "storage",
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.android.storage",
    deps = [
        "//java/arcs/android/crdt",
        "//java/arcs/android/storage",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/type",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/robolectric",
        "//third_party/java/truth:truth-android",
    ],
)
