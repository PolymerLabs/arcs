load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_android_library(
    name = "resurrection",
    srcs = glob(["*.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    deps = [
        "//java/arcs/android/common",  # unuseddeps: keep
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/util",
        "//third_party/java/androidx/annotation",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
