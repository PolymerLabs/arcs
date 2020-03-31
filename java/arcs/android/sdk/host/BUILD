load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_library(
    name = "host",
    srcs = glob(["*.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    deps = [
        "//java/arcs/android/host/parcelables",
        "//java/arcs/android/type",
        "//java/arcs/core/data",
        "//java/arcs/core/host",
        "//java/arcs/jvm/host",
        "//java/arcs/sdk/android/storage",
        "//third_party/java/androidx/annotation",
        "//third_party/java/androidx/lifecycle",
        "//third_party/java/androidx/lifecycle/service",
        "//third_party/kotlin/kotlin:kotlin_reflect",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
