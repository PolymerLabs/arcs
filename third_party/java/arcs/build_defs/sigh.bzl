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

    # The default bazel working directory for all actions is
    # WORKDIR: ~/.cache/bazel/_bazel_$USER/<project_path_hash>/execroot/__main__
    # All directories under the WORKDIR are symbolic links to the directories
    # at the source project tree.
    # The executed sigh commands would generate outputs against the WORKDIR ends
    # up the webpacking/building/etc processes cannot resolve the correct paths
    # under the <project_source_root>/**.
    # The trick 'cd -P tools/..' switches the symlink paths to the corresponding
    # physical directories at the <project_source_root> to ensure the anticipated
    # webpacking/building/etc results. If the 'tools' folder does not exist or
    # we are already at the physical directory, it does nothing.
    cmd = "cd -P tools/..; $(location //tools:sigh_bin) "
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
