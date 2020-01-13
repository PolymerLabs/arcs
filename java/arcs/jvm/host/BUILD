load("//third_party/java/arcs/build_defs:build_defs.bzl", "arcs_kt_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

arcs_kt_library(
    name = "host",
    srcs = glob(["*.kt"]),
    disable_lint_checks = ["NewApi"],
    wasm = False,
    deps = [
        "//java/arcs/core/host",
        "//java/arcs/core/sdk",
    ],
)
