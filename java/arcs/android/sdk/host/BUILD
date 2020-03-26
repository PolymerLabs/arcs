load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_library(
    name = "host",
    srcs = glob(["*.kt"]),
    idl_parcelables = glob(["*.aidl"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    deps = [
        "//java/arcs/android/host/parcelables",
        "//java/arcs/android/type",
        "//java/arcs/core/data",
        "//java/arcs/core/host",
        "//third_party/java/androidx/annotation",
        "//third_party/kotlin/kotlin:kotlin_reflect",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
