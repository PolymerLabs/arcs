"""Rules for Kotlin jvm particles."""

def _kotlin_serviceloader_registry(ctx):
    ctx.actions.expand_template(
        template = ctx.file._template,
        output = ctx.outputs.out,
        substitutions = {
            "{particles}": ctx.attr.particles,
        },
    )

kotlin_serviceloader_registry = rule(
    implementation = _kotlin_serviceloader_registry,
    attrs = {
        "particles": attr.string(doc = "Newline separated list of fully qualified particle classes"),
        "out": attr.output(
            mandatory = True,
            doc = "Output file created by this rule.",
        ),
        "_template": attr.label(
            default = "kotlin_serviceloader_registry_template.tmpl",
            allow_single_file = True,
        ),
    },
    doc = "Generates the annotations needed to make a Kotlin JVM particle auto-discoverable.",
)
