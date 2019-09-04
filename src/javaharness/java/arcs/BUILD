
licenses(["notice"])
package(default_visibility = ["//java/arcs:__subpackages__"])

load(
    "@io_bazel_rules_closure//closure:defs.bzl",
    "closure_js_library",
    "closure_repositories",
    "web_library",
)
load("@com_google_j2cl//build_defs:rules.bzl",
      "j2cl_library",
      "j2cl_import",
      "j2cl_application")

j2cl_import(
    name = "dagger-j2cl",
    jar = "@com_google_dagger//:com_google_dagger",
)

j2cl_library(
    name = "dagger_runtime-j2cl",
    srcs = ["@com_google_dagger_runtime//jar"],
    deps = [":javax_inject-j2cl"],
)

j2cl_library(
    name = "javax_inject-j2cl",
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
