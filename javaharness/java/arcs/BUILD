licenses(["notice"])

package(default_visibility = ["//javaharness/java/arcs:__subpackages__"])

load(
    "@io_bazel_rules_closure//closure:defs.bzl",
    "closure_js_library",
    "closure_repositories",
    "web_library",
)

filegroup(
    name = "pipes-shell-dist",
    srcs = glob(
        ["pipes-shell/web/deploy/dist/**/*"],
    ),
)

filegroup(
    name = "particles",
    srcs = glob(
        ["particles/PipeApps/**/*"],
    ),
)
