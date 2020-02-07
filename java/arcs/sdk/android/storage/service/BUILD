load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_android_library(
    name = "service",
    srcs = glob(["*.kt"]),
    manifest = "AndroidManifest.xml",
    deps = [
        "//java/arcs/android/common/resurrection",
        "//java/arcs/android/crdt",
        "//java/arcs/android/storage",
        "//java/arcs/android/storage/service",
        "//java/arcs/android/storage/service:aidl",
        "//java/arcs/android/storage/ttl",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/driver",
        "//third_party/java/androidx/annotation",
        "//third_party/java/androidx/work",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
