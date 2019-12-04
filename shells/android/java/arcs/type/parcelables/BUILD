licenses(["notice"])

package(default_visibility = ["//visibility:public"])

load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

kt_android_library(
    name = "parcelables",
    srcs = glob(["*.kt"]),
    idl_parcelables = glob(["*.aidl"]),
    manifest = "//shells/android/java/arcs/common:AndroidManifest.xml",
    deps = [
        "//src_kt/java/arcs/common",
        "//src_kt/java/arcs/data",
        "//src_kt/java/arcs/type",
    ],
)
