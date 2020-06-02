# Execution requirements for running commands in the repo root.
EXECUTION_REQUIREMENTS_TAGS = [
    "local",
]

# Same as the above, but as a dictionary.
EXECUTION_REQUIREMENTS_DICT = dict([(k, "1") for k in EXECUTION_REQUIREMENTS_TAGS])

def _write_shell_script(ctx, run_script):
    """Writes out a script for running a command in the repo root.

    If run_script is true, this function will also run the script.

    Returns the created script as a File object.
    """

    # Collect input and output files, and compute string substitutions.
    input_files = ctx.files.srcs
    input_paths = [f.path for f in input_files]
    SRCS = " ".join(input_paths)
    SRC = input_paths[0] if len(input_paths) == 1 else None

    output_files = ctx.outputs.outs
    output_paths = [f.path for f in output_files]
    OUTS = " ".join(output_paths)
    OUT = output_paths[0] if len(output_paths) == 1 else None

    # Perform cmd string substitutions.
    cmd = ctx.attr.cmd
    cmd = cmd.format(SRC = SRC, SRCS = SRCS, OUT = OUT, OUTS = OUTS)
    cmd = ctx.expand_location(cmd, ctx.attr.deps)

    # Write a shell script to perform the command.
    script_name = ctx.attr.name + ".sh"
    script_file = ctx.actions.declare_file(script_name)
    ctx.actions.expand_template(
        template = ctx.file._template,
        output = script_file,
        substitutions = {
            "{cmd}": cmd,
        },
    )

    # Optionally run the shell script.
    if run_script:
        # Running scripts via ctx.actions.run is not supported on Windows, so
        # we need to use ctx.actions.run_shell instead, with the script path as
        # our only command.
        ctx.actions.run_shell(
            command = script_file.path,
            inputs = depset(input_files + ctx.files.deps),
            outputs = output_files,
            tools = [script_file],
            progress_message = ctx.attr.progress_message,
            use_default_shell_env = True,
            execution_requirements = EXECUTION_REQUIREMENTS_DICT,
        )

        moved_files = [ctx.actions.declare_file(x.basename, sibling=x) for x in output_files]

        ctx.actions.run_shell(
            inputs = depset(output_files),
            outputs = moved_files,
            command = """
            for i in "$@"; do
              out="$(pwd)/bazel-out/host/bin/$i"
              cp $i $out
            done
            """

        )

    return script_file, output_files

def _run_in_repo(ctx):
    _, outputs = _write_shell_script(ctx = ctx, run_script = True)

#    return [DefaultInfo(files = depset(outputs))]

def _run_in_repo_test(ctx):
    script_file, outputs = _write_shell_script(ctx = ctx, run_script = False)
    return [DefaultInfo(
        executable = script_file,
        runfiles = ctx.runfiles(files = ctx.files.srcs + ctx.files.deps),
    )]

# Attributes for the run_in_repo rule.
_RUN_RULE_ATTRS = {
    "cmd": attr.string(
        doc = """
Command to run in the repo root. You can use standard python format placeholders
of the form \\{SRCS\\}, which will be substituted when the command is run.
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
    "deps": attr.label_list(
        allow_files = True,
    ),
    "_template": attr.label(
        default = "run_in_repo_template.sh",
        allow_single_file = True,
    ),
}

run_in_repo = rule(
    attrs = _RUN_RULE_ATTRS,
    doc = """
Runs the given shell command in the root directory of the repository. This lets
you read/write files directly from the repository (as opposed to the bazel
sandbox), so it can be destructive and can overwrite existing files.

Useful for invoking sigh commands.
""",
    implementation = _run_in_repo,
)

# Attributes for the run_in_repo_test rule. Same as above, but with no outputs.
_TEST_RULE_ATTRS = dict(_RUN_RULE_ATTRS)

_TEST_RULE_ATTRS["outs"] = attr.output_list(
    allow_empty = True,
    mandatory = False,
    doc = "Output file(s) created by this rule.",
)

run_in_repo_test = rule(
    attrs = _TEST_RULE_ATTRS,
    doc = "Equivalent to run_in_repo, but for tests.",
    test = True,
    implementation = _run_in_repo_test,
)
