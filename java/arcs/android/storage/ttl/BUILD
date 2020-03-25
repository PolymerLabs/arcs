load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

kt_android_library(
    name = "ttl",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/util",
        "//third_party/java/androidx/work",
    ],
)
