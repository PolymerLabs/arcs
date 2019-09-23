# Execution requirements for running commands in the repo root.
EXECUTION_REQUIREMENTS_TAGS = [
    "no-sandbox",
    "no-cache",
    "no-remote",
    "local",
]

# Same as the above, but as a dictionary.
EXECUTION_REQUIREMENTS_DICT = dict([(k, "1") for k in EXECUTION_REQUIREMENTS_TAGS])

def _absolute_path(repo_root, path):
    """Converts path relative to the repo root into an absolute file path."""
    return repo_root + "/" + path

def _write_shell_script(ctx, run_script):
    """Writes out a script for running a command in the repo root.

    If run_script is true, this function will also run the script.

    Returns the created script as a File object.
    """

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

    # Optionally run the shell script.
    if run_script:
        ctx.actions.run(
            executable = script_file,
            inputs = depset(input_files + ctx.files.deps),
            outputs = output_files,
            progress_message = ctx.attr.progress_message,
            use_default_shell_env = True,
            execution_requirements = EXECUTION_REQUIREMENTS_DICT,
        )

    return script_file

def _run_in_repo(ctx):
    _write_shell_script(ctx = ctx, run_script = True)

def _run_in_repo_test(ctx):
    script_file = _write_shell_script(ctx = ctx, run_script = False)

    return [DefaultInfo(
        executable = script_file,
        runfiles = ctx.runfiles(files = ctx.files.srcs + ctx.files.deps),
    )]

# Attributes for the run_in_repo rule.
_RUN_RULE_ATTRS = {
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
    "deps": attr.label_list(),
    "_template": attr.label(
        default = "run_in_repo_template.sh",
        allow_single_file = True,
    ),
}

run_in_repo = rule(
    implementation = _run_in_repo,
    attrs = _RUN_RULE_ATTRS,
    doc = """
Runs the given shell command in the root directory of the respository. This lets
you read/write files directly from the repository (as opposed to the bazel
sandbox), so it can be destructive and can overwrite existing files.

Useful for invoking sigh commands.
""",
)

# Attributes for the run_in_repo_test rule. Same as above, but with no outputs.
_TEST_RULE_ATTRS = dict(_RUN_RULE_ATTRS)
_TEST_RULE_ATTRS["outs"] = attr.output_list(
    allow_empty = True,
    mandatory = False,
    doc = "Output file(s) created by this rule.",
)

run_in_repo_test = rule(
    implementation = _run_in_repo_test,
    attrs = _TEST_RULE_ATTRS,
    test = True,
    doc = "Equivalent to run_in_repo, but for tests.",
)
