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
        # The pipes-shell and the Arcs runtime MUST be in place.
        # Otherwise all webview-based runtime services/bus/devtools
        # would malfunction.
        allow_empty = False,
    ),
)

filegroup(
    name = "particles",
    srcs = glob(
        ["particles/PipeApps/**/*"],
    ),
)
