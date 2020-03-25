"""Rules for Kotlin jvm particles."""

def _kotlin_serviceloader_registry(ctx):
    ctx.actions.write(ctx.outputs.out, "\n".join(ctx.attr.particles), False)

kotlin_serviceloader_registry = rule(
    implementation = _kotlin_serviceloader_registry,
    attrs = {
        "particles": attr.string_list(doc = "List of fully qualified particle classes"),
        "out": attr.output(
            mandatory = True,
            doc = "Output file created by this rule.",
        ),
    },
    doc = "Generates the annotations needed to make a Kotlin JVM particle auto-discoverable.",
)
