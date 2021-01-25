"""Arcs Kotlin Code-generation macro

Macros are re-exported in build_defs.bzl -- use those instead.
"""

load("//devtools/build_cleaner/skylark:build_defs.bzl", "register_extension_info")
load(":kotlin.bzl", "arcs_kt_library")
load(":manifest.bzl", "arcs_manifest")
load(":plan.bzl", "arcs_kt_plan")
load(":schemas.bzl", "arcs_kt_schema")
load(":util.bzl", "manifest_only")

def arcs_kt_gen(
        name,
        srcs,
        arcs_sdk_deps,
        data = [],
        deps = [],
        platforms = ["jvm"],
        test_harness = False,
        visibility = None):
    """Generates Kotlin files for the given .arcs files.

    This is a convenience wrapper that combines all code generation targets based on arcs files.

    Args:
      name: name of the target to create
      srcs: list of Arcs manifest files to include
      arcs_sdk_deps: build targets for the Arcs SDK to be included
      data: list of Arcs manifests needed at runtime
      deps: list of dependent arcs targets, such as an arcs_kt_gen target in a different package
      platforms: list of target platforms (currently, `jvm` and `wasm` supported).
      test_harness: whether to generate a test harness target
      visibility: visibility of the generated arcs_kt_library
    """

    manifest_name = name + "_manifest"
    schema_name = name + "_schema"
    plan_name = name + "_plan"

    arcs_manifest(
        name = manifest_name,
        srcs = manifest_only(srcs),
        manifest_proto = False,
        deps = deps,
    )

    schema = arcs_kt_schema(
        name = schema_name,
        srcs = srcs,
        arcs_sdk_deps = arcs_sdk_deps,
        deps = deps + [":" + manifest_name],
        platforms = platforms,
        test_harness = test_harness,
        visibility = visibility,
    )

    plan = arcs_kt_plan(
        name = plan_name,
        srcs = srcs,
        arcs_sdk_deps = arcs_sdk_deps,
        data = [":" + manifest_name],
        deps = deps + [":" + schema_name],
        platforms = platforms,
        visibility = visibility,
    )

    # generates combined library. This allows developers to more easily see what is generated.
    arcs_kt_library(
        name = name,
        srcs = depset(schema["outs"] + plan["outs"]).to_list(),
        platforms = platforms,
        deps = depset(schema["deps"] + plan["deps"] + manifest_only(deps, inverse = True)).to_list(),
        visibility = visibility,
    )

register_extension_info(
    extension = arcs_kt_gen,
    label_regex_for_dep = "{extension_name}\\-kt",
)
