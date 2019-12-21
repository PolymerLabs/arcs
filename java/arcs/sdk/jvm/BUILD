load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_jvm_library")
load("//third_party/java/arcs/build_defs/internal:kotlin.bzl", "KOTLINC_OPTS")

licenses(["notice"])

arcs_kt_jvm_library(
    name = "arcs",
    srcs = glob([
        "*.kt",
    ]) + ["//third_party/java/arcs/sdk/kotlin:kotlin-common"],
    kotlincopts = KOTLINC_OPTS + ["-Xallow-kotlin-package"],
    visibility = ["//visibility:public"],
)
