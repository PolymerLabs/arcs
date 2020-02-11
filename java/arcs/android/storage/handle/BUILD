load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_android_library(
    name = "handle",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/android/crdt",
        "//java/arcs/core/crdt",
        "//java/arcs/core/storage/handle",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/sdk/android/storage",
        "//third_party/java/androidx/lifecycle",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
