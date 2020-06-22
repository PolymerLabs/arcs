def _recipe2plan_impl(ctx):
    output_name = ctx.label.name + "_GeneratedPlan.kt"
    out = ctx.actions.declare_file(output_name)

    args = ctx.actions.args()

    args.add_all("--outdir", [out.dirname])
    args.add_all("--outfile", [output_name])
    args.add_all([src.path for src in ctx.files.srcs])

    ctx.actions.run(
        inputs = ctx.files.srcs,
        outputs = [out],
        arguments = [args],
        tools = ctx.files.data,
        executable = ctx.executable._compiler,
    )

    return [DefaultInfo(files = depset([out]))]

recipe2plan = rule(
    implementation = _recipe2plan_impl,
    attrs = {
        "srcs": attr.label_list(allow_files = [".arcs"]),
        "deps": attr.label_list(),
        "data": attr.label_list(allow_files = True),
        "platform": attr.string(
            values = ["jvm", "wasm"],
            default = "jvm",
        ),
        "_compiler": attr.label(
            cfg = "host",
            default = Label("//src/tools:recipe2plan"),
            allow_files = True,
            executable = True,
        ),
    },
    doc = """Stand-alone schema2* tool.""",
)
