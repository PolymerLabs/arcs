load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_jvm_library(
    name = "host",
    srcs = glob(["*.kt"]),
    disable_lint_checks = ["NewApi"],
    deps = [
        "//java/arcs/core/host",
        "//java/arcs/core/storage/api",
    ],
)
