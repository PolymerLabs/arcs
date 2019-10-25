load(":run_in_repo.bzl", "EXECUTION_REQUIREMENTS_TAGS", "run_in_repo", "run_in_repo_test")

def sigh_command(
        name,
        srcs,
        sigh_cmd,
        progress_message = "",
        outs = [],
        deps = [],
        execute = True,
        quiet = True,
        visibility = []):
    """Runs the tool/sigh command from bazel with the given sign_cmd arguments.
    Note: Any files (e.g. additional src, build outputs, etc) needed to be seen
    by the sigh tool should be added in the deps attribute."""

    run_macro = run_in_repo if execute else run_in_repo_test

    cmd = "$(location //tools:sigh_bin) "
    if quiet:
        cmd += "--quiet "
    cmd += sigh_cmd

    run_macro(
        name = name,
        srcs = srcs,
        outs = outs,
        cmd = cmd,
        progress_message = progress_message,
        tags = EXECUTION_REQUIREMENTS_TAGS,
        deps = [
            "//:all_srcs",
            "//:node_modules",
            "//tools:sigh_bin",
            "//tools:tools_srcs",
            "//:tsconfig",
        ] + deps,
        visibility = visibility,
    )
