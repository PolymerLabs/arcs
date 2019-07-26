load("@io_bazel_rules_closure//closure:defs.bzl", "closure_js_library")

licenses(["notice"])  # Apache 2.0
package(default_visibility = ["//visibility:public"])

load(
    "@io_bazel_rules_closure//closure:defs.bzl",
    "closure_repositories",
    "web_library",
)

load("@com_google_j2cl//build_defs:rules.bzl", "j2cl_library", "j2cl_import", "j2cl_application")
load(
    "@io_bazel_rules_closure//closure:defs.bzl",
    "closure_repositories",
    "web_library",
)

j2cl_import(
    name = "dagger",
    jar = "@com_google_dagger//:com_google_dagger",
)

j2cl_library(
    name = "dagger_runtime",
    srcs = ["@com_google_dagger_runtime//jar"],
    deps = [":javax_inject"],
)

j2cl_library(
    name = "javax_inject",
    srcs = ["@javax_inject_source//jar"],
)

filegroup(
    name = "pipes-shell-dist",
    srcs = glob(
        ["pipes-shell/web/deploy/dist/**/*"],
        exclude = glob(["pipes-shell/web/deploy/dist/**/*.html"]),
    ),
)

filegroup(
    name = "particles",
    srcs = glob(
        ["particles/PipeApps/**/*"],
    ),
)

j2cl_application(
    name = "javaharness",
    entry_points = ["arcs.harness"],
    extra_dev_resources = [":pipes-shell-dist", ":particles"],
    deps = ["//java/arcs/webimpl:harness_js"],
)
