"""Macro for running TypeScript tests with bazel."""

load(":sigh.bzl", "sigh_command")

# A change that should not affect copybara.
# Another change that should not affect copy
def arcs_ts_test(name, src, deps, flaky = False):
    """Runs a TypeScript test file using `sigh test`."""
    sigh_command(
        name = name,
        srcs = [src],
        execute = False,
        flaky = flaky,
        sigh_cmd = "test --bazel --file {SRC}",
        deps = deps,
    )
