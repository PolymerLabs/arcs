def _create_wasm_prelude(ctx):
    ctx.actions.expand_template(
        template = ctx.file._template,
        output = ctx.outputs.out,
        substitutions = {
            "{particle}": ctx.attr.particle,
            "{package}": ctx.attr.package,
        },
    )

create_wasm_prelude = rule(
    implementation = _create_wasm_prelude,
    attrs = {
        "particle": attr.string(doc = "Name of the particle"),
        "package": attr.string(doc = "Kotlin package for the particle"),
        "out": attr.output(
            mandatory = True,
            doc = "Output file created by this rule.",
        ),
        "_template": attr.label(
            default = "wasm_prelude_template.kt",
            allow_single_file = True,
        ),
    },
)
