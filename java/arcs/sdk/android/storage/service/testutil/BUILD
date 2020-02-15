load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_android_library(
    name = "testutil",
    testonly = 1,
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/android/storage",
        "//java/arcs/sdk/android/storage/service",
        "//third_party/java/robolectric",
    ],
)
