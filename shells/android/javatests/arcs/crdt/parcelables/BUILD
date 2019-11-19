licenses(["notice"])

package(default_visibility = ["//visibility:public"])

load("//tools/build_defs/android:rules.bzl", "android_local_test")
load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

[
    [
        android_local_test(
            name = src_file[:-3],
            size = "small",
            manifest = "//shells/android/java/arcs/common:AndroidManifest.xml",
            test_class = "arcs.crdt.parcelables.%s" % src_file[:-3],
            deps = [
                ":%sLib" % src_file[:-3],
                "@robolectric//bazel:android-all",
            ],
        ),
        kt_android_library(
            name = src_file[:-3] + "Lib",
            srcs = [src_file],
            manifest = "//shells/android/java/arcs/common:AndroidManifest.xml",
            deps = [
                "//shells/android/java/arcs/crdt/parcelables",
                "//src_kt/java/arcs/crdt",
                "//src_kt/java/arcs/crdt/internal",
                "//third_party/android/androidx_test/core",
                "//third_party/android/androidx_test/ext/junit",
                "//third_party/java/junit",
                "//third_party/java/mockito",
                "//third_party/java/robolectric",
                "//third_party/java/truth",
            ],
        ),
    ]
    for src_file in glob(["*.kt"])
]
