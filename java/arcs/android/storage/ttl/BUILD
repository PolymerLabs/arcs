load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_library(
    name = "ttl",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/android/storage/database",
        "//java/arcs/core/storage/database",
        "//java/arcs/core/util",
        "//third_party/java/androidx/work",
    ],
)
