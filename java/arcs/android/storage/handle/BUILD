load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_library(
    name = "handle",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/android/crdt",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/handle",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/util",
        "//java/arcs/jvm/util",
        "//java/arcs/sdk/android/storage",
        "//third_party/java/androidx/lifecycle",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
