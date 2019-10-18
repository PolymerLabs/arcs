load(":run_in_repo.bzl", "run_in_repo", "EXECUTION_REQUIREMENTS_TAGS", "run_in_repo_test")

def sigh_command(name, srcs, sigh_cmd, progress_message = "", outs = [],
                 deps = [], execute = True, visibility = []):
    run_macro = run_in_repo if execute else run_in_repo_test
    run_macro(
            name = name,
            srcs = srcs,
            outs = outs,
            deps = [
                "//:all_srcs",
                "//:node_modules",
                "//tools:sigh_bin",
                "//tools:tools_srcs",
                "//:tsconfig",
            ] + deps,
            # TODO: generated header guard should contain whole workspace-relative
            # path to file.
            cmd = "$(location //tools:sigh_bin) " + sigh_cmd,
            progress_message = progress_message,
            tags = EXECUTION_REQUIREMENTS_TAGS,
        )

