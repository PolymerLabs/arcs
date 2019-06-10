licenses(["notice"])  # Apache 2.0

package(default_visibility = ["//visibility:public"])

load("@io_bazel_rules_closure//closure:defs.bzl", "closure_js_library")
load("@com_google_j2cl//build_defs:rules.bzl", "j2cl_library")

j2cl_library(
    name = "webimpl",
    srcs = glob([
        "*.java",
    ]),
    deps = [
        "//java/arcs:dagger",
        "//java/arcs:dagger_runtime",
        "//java/arcs:javax_inject",
        "//java/arcs/api:javaharness_lib-j2cl",
        "//java/arcs/nativeparticles:nativeparticles-j2cl",
        "@com_google_elemental2//:elemental2-core-j2cl",
        "@com_google_elemental2//:elemental2-dom-j2cl",
        "@com_google_j2cl//:jsinterop-annotations-j2cl",
        "@com_google_jsinterop_base//:jsinterop-base-j2cl",
    ],
)

closure_js_library(
    name = "harness_js",
    srcs = ["harness_entry.js"],
    externs = ["externs.js"],
    suppress = [
        "checkTypes",
        "reportUnknownTypes",
    ],
    deps = [":webimpl"],
)
