"""Arcs Plan Generation Rules"""

load(":kotlin.bzl", "arcs_kt_library")
load(":manifest.bzl", "arcs_proto_plan")
load(
    ":tools.oss.bzl",
    "arcs_tool_recipe2plan",
    "arcs_tool_recipe2plan_2",
)
load(
    ":util.bzl",
    "manifest_only",
    "replace_arcs_suffix",
)

def arcs_kt_plan(
        name,
        arcs_sdk_deps,
        srcs = [],
        data = [],
        deps = [],
        platforms = ["jvm"],
        visibility = None):
    """Converts recipes from manifests into Kotlin plans.

    Example:

      Direct dependency on this target is required for use. This rule depends on the output from arcs_kt_schema.

      ```
          arcs_kt_schema(
            name = "foo_schemas",
            srcs = ["foo.arcs"],
          )

          arcs_kt_plan(
            name = "foo_plans",
            srcs = ["foo.arcs"],
            deps = [":foo_schemas"],
          )

          arcs_kt_library(
            name = "arcs_lib",
            srcs = glob("*.kt"),
            deps = [":foo_plans"],
          )
      ```

    Args:
      name: the name of the target to create
      arcs_sdk_deps: build targets for the Arcs SDK to be included
      srcs: list of Arcs manifest files
      data: list of Arcs manifests needed at runtime
      deps: list of dependencies (jars)
      platforms: list of target platforms (currently, `jvm` and `wasm` supported).
      visibility: visibility of the generated arcs_kt_library

    Returns:
      Dictionary of:
        "outs": output files. other rules can use this to bundle outputs.
        "deps": deps of those outputs.
    """
    outs = []

    for src in srcs:
        genrule_name = replace_arcs_suffix(src, "_GeneratedPlan")
        out = replace_arcs_suffix(src, "_GeneratedPlan.kt")
        outs.append(out)
        rest = [s for s in srcs if s != src]
        arcs_tool_recipe2plan(
            name = genrule_name,
            srcs = [src],
            outs = [out],
            deps = deps + data + rest,
        )

    deps = manifest_only(deps, inverse = True)

    arcs_kt_library(
        name = name,
        srcs = outs,
        platforms = platforms,
        visibility = visibility,
        deps = arcs_sdk_deps + deps,
    )
    return {"outs": outs, "deps": arcs_sdk_deps}

# Note: Once this is mature, it will replace arcs_kt_plan
def arcs_kt_plan_2(name, package, arcs_sdk_deps, srcs = [], deps = [], visibility = None):
    """Converts recipes from manifests into Kotlin plans, via Kotlin.

    Example:

      ```
      arcs_kt_plan_2(
        name = "example_plan",
        srcs = ["Example.arcs"],
        package = "com.my.example", // Temporary (b/161994250)
      )
      ```

    Args:
      name: name of created target
      package: the package that all generated code will belong to (temporary, see b/161994250).
      arcs_sdk_deps: build targets for the Arcs SDK to be included
      srcs: list of Arcs manifest files
      deps: JVM dependencies for Jar
      visibility: list of visibilities
    """
    plans = []
    for src in srcs:
        proto_name = replace_arcs_suffix(src, "_proto")
        plan_name = replace_arcs_suffix(src, "_GeneratedPlan2")

        arcs_proto_plan(
            name = proto_name,
            src = src,
        )

        arcs_tool_recipe2plan_2(
            name = plan_name,
            src = ":" + proto_name,
            package = package,
        )

        plans.append(":" + plan_name)

    arcs_kt_library(
        name = name,
        srcs = plans,
        platforms = ["jvm"],
        visibility = visibility,
        deps = arcs_sdk_deps + deps,
    )
