load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_test_suite(
    name = "parcelables",
    manifest = "//shells/android/java/arcs/common:AndroidManifest.xml",
    package = "arcs.crdt.parcelables",
    deps = [
        "//java/arcs/core/crdt",
        "//java/arcs/core/crdt/internal",
        "//shells/android/java/arcs/crdt/parcelables",
        "//third_party/android/androidx_test/core",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit",
        "//third_party/java/mockito",
        "//third_party/java/robolectric",
        "//third_party/java/truth",
    ],
)
