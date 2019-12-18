"""Rules for Kotlin wasm particles."""

def _kotlin_wasm_annotations(ctx):
    ctx.actions.expand_template(
        template = ctx.file._template,
        output = ctx.outputs.out,
        substitutions = {
            "{label}": str(ctx.label),
            "{particle}": ctx.attr.particle,
            "{package}": ctx.attr.package,
        },
    )

kotlin_wasm_annotations = rule(
    implementation = _kotlin_wasm_annotations,
    attrs = {
        "particle": attr.string(doc = "Name of the particle"),
        "package": attr.string(doc = "Kotlin package for the particle"),
        "out": attr.output(
            mandatory = True,
            doc = "Output file created by this rule.",
        ),
        "_template": attr.label(
            default = "kotlin_wasm_annotations_template.kt",
            allow_single_file = True,
        ),
    },
    doc = "Generates the annotations needed for a Kotlin wasm particle.",
)
