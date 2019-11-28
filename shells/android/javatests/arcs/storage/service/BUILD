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
            test_class = "arcs.storage.service.%s" % src_file[:-3],
            deps = [
                ":%sLib" % src_file[:-3],
                "@robolectric//bazel:android-all",
            ],
        ),
        kt_android_library(
            name = src_file[:-3] + "Lib",
            testonly = True,
            srcs = [src_file],
            manifest = "//shells/android/java/arcs/common:AndroidManifest.xml",
            deps = [
                "//shells/android/java/arcs/crdt/parcelables",
                "//shells/android/java/arcs/storage/parcelables",
                "//shells/android/java/arcs/storage/service",
                "//src_kt/java/arcs/crdt",
                "//src_kt/java/arcs/crdt/internal",
                "//src_kt/java/arcs/storage",
                "//src_kt/java/arcs/storage/driver",
                "//src_kt/java/arcs/testutil",
                "//third_party/android/androidx_test/core",
                "//third_party/android/androidx_test/ext/junit",
                "//third_party/java/junit",
                "//third_party/java/mockito",
                "//third_party/java/robolectric",
                "//third_party/java/truth",
                "//third_party/kotlin/kotlinx/kotlinx_coroutines",
                "//third_party/kotlin/kotlinx/kotlinx_coroutines:kotlinx_coroutines_test",
            ],
        ),
    ]
    for src_file in glob(["*.kt"])
]
