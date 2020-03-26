load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_android_library(
    name = "util",
    srcs = glob(["*.kt"]),
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    deps = [
        "//java/arcs/core/util",
        "//java/arcs/core/util/performance",
        "//third_party/java/arcs/deps:protobuf_javalite",
    ],
)
