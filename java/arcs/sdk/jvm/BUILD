load("//java/arcs/sdk/common:variables.bzl", "KOTLINC_OPTS")
load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_jvm_library")

licenses(["notice"])

arcs_kt_jvm_library(
    name = "arcs",
    srcs = glob([
        "*.kt",
    ]) + ["//java/arcs/sdk/common:arcs"],
    kotlincopts = KOTLINC_OPTS + ["-Xallow-kotlin-package"],
    visibility = ["//visibility:public"],
)
