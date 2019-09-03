def _absolute_path(repo_root, path):
    """Converts path relative to the repo root into an absolute file path."""
    return repo_root + "/" + path

def _run_in_repo(ctx):
    # Extract the repo root directory from .bazelrc
    if "repo_root" not in ctx.var:
        fail(
            "\n*****\n" +
            "repo_root is not defined. Run the following command from the root " +
            "of your workspace:\n\n" +
            "echo \"build --define=repo_root=$(pwd)\" >> .bazelrc\n" +
            "*****\n\n",
        )
    repo_root = ctx.var["repo_root"]

    # Collect input and output files, and compute string substitutions.
    input_files = ctx.files.srcs
    input_paths = [f.path for f in input_files]
    SRCS = " ".join(input_paths)
    SRC = input_paths[0] if len(input_paths) == 1 else None

    output_files = ctx.outputs.outs
    output_paths = [_absolute_path(repo_root, f.path) for f in output_files]
    OUTS = " ".join(output_paths)
    OUT = output_paths[0] if len(output_paths) == 1 else None

    # Perform cmd string substitutions.
    cmd = ctx.attr.cmd
    cmd = cmd.format(SRC = SRC, SRCS = SRCS, OUT = OUT, OUTS = OUTS)

    # Write a shell script to perform the command.
    script_name = ctx.attr.name + ".sh"
    script_file = ctx.actions.declare_file(script_name)
    ctx.actions.expand_template(
        template = ctx.file._template,
        output = script_file,
        substitutions = {
            "{repo_root}": repo_root,
            "{cmd}": cmd,
        },
    )

    # Run the shell script.
    ctx.actions.run(
        executable = script_file,
        inputs = input_files,
        outputs = output_files,
        progress_message = ctx.attr.progress_message,
        use_default_shell_env = True,
        execution_requirements = {
            "no-sandbox": "1",
            "no-cache": "1",
            "no-remote": "1",
            "local": "1",
        },
    )

run_in_repo = rule(
    implementation = _run_in_repo,
    attrs = {
        "cmd": attr.string(
            doc = """
Command to run in the repo root. You can use standard python format placeholders
of the form \{SRCS\}, which will be substituted when the command is run.
Placeholders are:
 * SRCS: list of input source files (relative to repo root).
 * OUTS: list of output files (absolute filesystem paths).
You can also use SRC and OUT, provided you have supplied only a single input or
output file respectively.
""",
        ),
        "outs": attr.output_list(
            allow_empty = False,
            mandatory = True,
            doc = "Output file(s) created by this rule.",
        ),
        "srcs": attr.label_list(
            allow_files = True,
            doc = "Input file(s) used by this rule.",
        ),
        "progress_message": attr.string(
            doc = "Message to display when running the command.",
        ),
        "_template": attr.label(
            default = "run_in_repo_template.sh",
            allow_single_file = True,
        ),
    },
    doc = """
Runs the given shell command in the root directory of the respository. This lets
you read/write files directly from the repository (as opposed to the bazel
sandbox), so it can be destructive and can overwrite existing files.

Useful for invoking sigh commands.
""",
)
