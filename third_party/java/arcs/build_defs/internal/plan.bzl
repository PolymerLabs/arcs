"""Arcs Plan Generation Rules"""


def _recipe2plan_impl(ctx):
    args = ctx.actions.args()

    output = ctx.actions.declare_file(ctx.label.name + ".jvm.kt")

    args.add_all("--package-name", [ctx.attr.package])
    args.add_all([ctx.file.src, output.path])

    ctx.actions.run(
        inputs = [ctx.file.src],
        outputs = [output],
        arguments = [args],
        executable = ctx.executable.compiler,
    )

    return [DefaultInfo(files = depset([output]))]

recipe2plan = rule(
    implementation = _recipe2plan_impl,
    attrs = {
        "src": attr.label(allow_single_file = [".pb.bin"]),
        "package": attr.string(),
        "compiler": attr.label(
            cfg = "host",
            default = Label("//java/arcs/tools:recipe2plan"),
            allow_files = True,
            executable = True,
        ),
        # TODO(b/162273478) recipe2plan should accept `policies` argument
    },
    doc = """Generates plans from recipes.

    This rule reads serialized manifests and generates Kotlin files with `Plan` classes.
    """,
)
