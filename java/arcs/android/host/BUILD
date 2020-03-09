load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_android_library(
    name = "host",
    srcs = glob(["*.kt"]),
    idl_parcelables = glob(["*.aidl"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    deps = [
        "//java/arcs/android/host/parcelables",
        "//java/arcs/android/sdk/host",
        "//java/arcs/android/type",
        "//java/arcs/core/common",
        "//java/arcs/core/host",
        "//java/arcs/core/host:api",
        "//java/arcs/core/storage/api",
        "//java/arcs/jvm/host",
        "//third_party/java/androidx/annotation",
        "//third_party/java/jsr305_annotations",
    ],
)
