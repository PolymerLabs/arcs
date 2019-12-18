load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

exports_files(["AndroidManifest.xml"])

kt_android_library(
    name = "common",
    srcs = glob(["*.kt"]),
    manifest = "AndroidManifest.xml",
)
