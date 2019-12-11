load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_test_suite(
    name = "parcelables",
    manifest = "//shells/android/java/arcs/common:AndroidManifest.xml",
    package = "arcs.storage.parcelables",
    deps = [
        "//java/arcs/core/crdt",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/driver",
        "//shells/android/java/arcs/crdt/parcelables",
        "//shells/android/java/arcs/storage/parcelables",
        "//third_party/android/androidx_test/core",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit",
        "//third_party/java/mockito",
        "//third_party/java/robolectric",
        "//third_party/java/truth",
    ],
)
