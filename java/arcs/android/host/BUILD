load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_library(
    name = "host",
    testonly = 1,
    srcs = glob(["*.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    visibility = [
        "//java/arcs/android/demo:__pkg__",
        "//java/arcs/android/sdk/host:__pkg__",
        "//javatests/arcs/android:__subpackages__",
    ],
    deps = [
        "//java/arcs/android/sdk/host",
        "//java/arcs/core/host",
        "//java/arcs/core/host/api",
        "//java/arcs/jvm/host",
        "//java/arcs/sdk/android/storage",
        "//third_party/java/androidx/annotation",
        "//third_party/java/androidx/lifecycle",
        "//third_party/java/androidx/lifecycle/service",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
