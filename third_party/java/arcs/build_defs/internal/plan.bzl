"""Arcs Plan Generation Rules"""

load(
    "//third_party/java/arcs/build_defs/internal:kotlin.bzl",
    "ARCS_SDK_DEPS",
    "arcs_kt_library",
)

# Note: Once this is mature, it will replace arcs_kt_plan
def arcs_kt_plan_2(name, package, srcs = [], deps = [], visibility = None):
    """Generates Plans Jar from protos.

    Example:

      ```
      arcs_proto_plan(
        name = "serialized_example",
        src = "Example.arcs"
      )

      arcs_plan_generation(
        name = "example_plan",
        srcs = [":serialized_example"],
        package = "com.my.example",
      )
      ```

    Arcs:
      name: name of created target
      package: the package that all generated code will belong to (temporary, see b/161994250).
      deps: JVM dependencies for Jar
      visibility: list of visibilities
    """

    gen_name = name + "_GeneratedPlan"

    recipe2plan(
        name = gen_name,
        srcs = srcs,
        package = package,
    )

    arcs_kt_library(
        name = name,
        srcs = [":" + gen_name],
        platforms = ["jvm"],
        visibility = visibility,
        deps = ARCS_SDK_DEPS + deps,
    )

def _recipe2plan_impl(ctx):
    args = ctx.actions.args()

    outputs = [ctx.actions.declare_file(src.basename.replace(".pb.bin", ".jvm.kt")) for src in ctx.files.srcs]

    args.add_all("--outdir", [outputs[0].dirname])
    args.add_all("--package-name", [ctx.attr.package])
    args.add_all([src.path for src in ctx.files.srcs])

    ctx.actions.run(
        inputs = ctx.files.srcs,
        outputs = outputs,
        arguments = [args],
        executable = ctx.executable._compiler,
    )

    return [DefaultInfo(files = depset(outputs))]

recipe2plan = rule(
    implementation = _recipe2plan_impl,
    attrs = {
        "srcs": attr.label_list(allow_files = [".pb.bin"]),
        "package": attr.string(),
        "_compiler": attr.label(
            cfg = "host",
            default = Label("//java/arcs/tools:recipe2plan"),
            allow_files = True,
            executable = True,
        ),
    },
    doc = """Generates plans from recipes.

    This rule reads serialized manifests and generates Kotlin files with `Plan` classes.
    """,
)
