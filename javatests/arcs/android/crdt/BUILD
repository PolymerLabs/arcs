load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

arcs_kt_android_test_suite(
    name = "crdt",
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.android.crdt",
    deps = [
        "//java/arcs/android/crdt",  # buildcleaner: keep
        "//java/arcs/android/util",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data/util:data-util",
        "//third_party/android/androidx_test/ext/junit",
        "//third_party/java/junit:junit-android",
        "//third_party/java/robolectric",
        "//third_party/java/truth:truth-android",
    ],
)
