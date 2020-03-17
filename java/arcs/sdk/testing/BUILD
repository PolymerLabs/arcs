load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_library(
    name = "testing",
    testonly = 1,
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/sdk",
        "//java/arcs/sdk/storage",
    ],
)
