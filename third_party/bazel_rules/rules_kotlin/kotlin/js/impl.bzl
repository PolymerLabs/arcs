"""Implementation of Kotlin JS rules."""

load("@io_bazel_rules_kotlin//kotlin/internal:defs.bzl", "KtJsInfo")

def kt_js_import_impl(ctx):
    """Implementation for kt_js_import.

    Args:
      ctx: rule context

    Returns:
      Providers for the build rule.
    """
    if len(ctx.files.jars) != 1:
        fail("a single jar should be supplied, multiple jars not supported")
    jar_file = ctx.files.jars[0]

    args = ctx.actions.args()
    args.add("--jar", jar_file)
    args.add("--out_pattern", "\\.js$")
    args.add("--out", ctx.outputs.js)
    args.add("--aux_pattern", "\\.js\\.map$")
    args.add("--aux", ctx.outputs.js_map)

    tools, _, input_manifest = ctx.resolve_command(tools = [ctx.attr._importer])
    ctx.actions.run(
        inputs = [jar_file],
        tools = tools,
        executable = ctx.executable._importer,
        outputs = [
            ctx.outputs.js,
            ctx.outputs.js_map,
        ],
        arguments = [args],
        input_manifests = input_manifest,
    )

    return [
        DefaultInfo(
            files = depset([ctx.outputs.js, ctx.outputs.js_map]),
        ),
        KtJsInfo(
            js = ctx.outputs.js,
            js_map = ctx.outputs.js_map,
            jar = jar_file,
            srcjar = ctx.files.srcjar[0],
        ),
    ]
