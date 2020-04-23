load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_library(
    name = "util",
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/util",
        "@maven//:com_github_h0tk3y_betterParse_better_parse_jvm",
    ],
)
