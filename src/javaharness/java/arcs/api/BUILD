load("@io_bazel_rules_closure//closure:defs.bzl", "closure_js_library")

licenses(["notice"])  # Apache 2.0

package(default_visibility = ["//visibility:public"])

load("@com_google_j2cl//build_defs:rules.bzl", "j2cl_library")

j2cl_library(
    name = "javaharness_lib-j2cl",
    srcs = glob([
        "*.java",
    ]),
    deps = [
        "//java/arcs:dagger",
        "//java/arcs:dagger_runtime",
        "//java/arcs:javax_inject",
    ],
)
