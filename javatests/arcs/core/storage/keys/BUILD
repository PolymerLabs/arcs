load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

TEST_SRCS = glob(["*Test.kt"])

arcs_kt_android_test_suite(
    name = "keys",
    srcs = TEST_SRCS,
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.core.storage.keys",
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/keys",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
    ],
)
