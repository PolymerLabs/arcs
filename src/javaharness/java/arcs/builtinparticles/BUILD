load("@io_bazel_rules_closure//closure:defs.bzl", "closure_js_library")

licenses(["notice"])

package(default_visibility = ["//java/arcs:__subpackages__"])

load("@com_google_j2cl//build_defs:rules.bzl", "j2cl_library")

java_library(
    name = "builtinparticles",
    srcs = glob([
        "*.java",
    ]),
    deps = [
        "//java/arcs/api",
        "@com_google_dagger",
        "@javax_inject_source//jar",
    ],
)

j2cl_library(
    name = "builtinparticles-j2cl",
    srcs = glob([
        "*.java",
    ]),
    deps = [
        "//java/arcs:dagger-j2cl",
        "//java/arcs:dagger_runtime-j2cl",
        "//java/arcs:javax_inject-j2cl",
        "//java/arcs/api:api-j2cl",
    ],
)
