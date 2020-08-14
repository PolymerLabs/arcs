"""Defines a run_test helper rule for invoking a test binary."""

load("//third_party/bazel_skylib/lib:shell.bzl", "shell")

# Template for a bash script to run a binary with arguments.
_RUN_TEST_TEMPLATE = """\
#!/bin/bash
{binary_path} {args}
"""

def _run_test_impl(ctx):
    # Expand $(location ...) templates in the test args.
    data = ctx.attr.data
    args = [ctx.expand_location(arg, data) for arg in ctx.attr.test_args]
    args = " ".join([shell.quote(arg) for arg in args])

    # Compute the path to the test binary.
    binary_label = ctx.attr.test_binary.label
    binary_path = "%s/%s" % (binary_label.package, binary_label.name)

    # Generate a script to run the test binary with the given args.
    content = _RUN_TEST_TEMPLATE.format(binary_path = binary_path, args = args)
    script = ctx.actions.declare_file(ctx.label.name)
    ctx.actions.write(
        output = script,
        content = content,
        is_executable = True,
    )

    # Merge the runfiles from the test binary and data dependencies.
    runfiles = ctx.attr.test_binary[DefaultInfo].default_runfiles
    files = []
    for datum in data:
        info = datum[DefaultInfo]
        runfiles = runfiles.merge(info.default_runfiles)
        files.append(info.files)
    runfiles = runfiles.merge(ctx.runfiles(transitive_files = depset(transitive = files)))

    return [DefaultInfo(
        executable = script,
        runfiles = runfiles,
    )]

run_test = rule(
    implementation = _run_test_impl,
    test = True,
    doc = "Runs the given test binary with given arguments.",
    attrs = {
        "test_binary": attr.label(
            executable = True,
            mandatory = True,
            cfg = "target",
            doc = "The test binary to run.",
        ),
        "test_args": attr.string_list(
            allow_empty = True,
            doc = "Command line flags to pass to the test binary.",
        ),
        "data": attr.label_list(
            allow_empty = True,
            allow_files = True,
            doc = "Extra data files needed when running the test.",
        ),
    },
)
