package(default_visibility = ["//visibility:public"])

load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")

kt_jvm_library(
    name = "testutil",
    srcs = glob(["*.kt"]),
    deps = [
        "//src_kt/java/arcs/util",
    ],
    testonly = True,
)
