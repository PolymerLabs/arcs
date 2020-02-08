load("//third_party/java/arcs/build_defs/internal:manifest.bzl", "arcs_manifest_json")

def _recipe2plan_impl(ctx):
    output_name = ctx.label.name + ".kt"
    serialized_name = ctx.label.name + ".json"
    out = ctx.actions.declare_file(output_name)
    ir_out = ctx.actions.declare_file(serialized_name)

    # Serialize arcs manifest
    arcs_manifest_json(
      name = ctx.label.name + "-serializing",
      srcs = ctx.files.srcs,
      out = serialized_name,
    )

    args = ctx.actions.args()

    args.add_all("--outfile", [output_name])
    args.add_all("--outdir", [out.dirname])
    args.add_all("--package-name", [ctx.attr.package])
    args.add_all([ir_out])

    ctx.actions.run(
        inputs = [ir_out],
        outputs = [out],
        arguments = [args],
        executable = ctx.executable._compiler,
    )

    return [DefaultInfo(files = depset([out]))]

recipe2plan = rule(
    implementation = _recipe2plan_impl,
    attrs = {
        "srcs": attr.label_list(allow_files = [".arcs"]),
        "package": attr.string(),
        "_compiler": attr.label(
            cfg = "host",
            default = Label("//src/tools:recipe2plan"),
            allow_files = True,
            executable = True,
        ),
    },
    doc = """Generates plans from recipes.

    This rule reads recipes from a serialized manifest and generates Kotlin `Plan` classes.
    """,
)
