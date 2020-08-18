"""Rules that invoke sigh scripts or other binary tools.

Put as little logic/validation here as possible. Prefer adding proper wrapper
functions and documentation in other .bzl files, and reserve this file for only
the actual sigh_command invocations.
"""

load("//third_party/java/arcs/build_defs:sigh.bzl", "sigh_command")
load("//third_party/java/arcs/build_defs/internal:plan.bzl", "recipe2plan")
load(":run_test.bzl", "run_test")

# buildifier: disable=function-docstring
def arcs_tool_recipe2plan(name, srcs, outs, deps, generate_proto = False, recipe = None):
    sigh_cmd = "recipe2plan --quiet --outdir $(dirname {OUT}) --outfile $(basename {OUT})"
    if generate_proto:
        sigh_cmd += " --format proto"
    if recipe:
        sigh_cmd += " --recipe " + recipe
    sigh_cmd += " {SRC}"

    plan_type = "Proto" if generate_proto else "Kotlin"

    sigh_command(
        name = name,
        srcs = srcs,
        outs = outs,
        progress_message = "Generating Arcs Plan (%s)" % plan_type,
        sigh_cmd = sigh_cmd,
        deps = deps,
    )

# buildifier: disable=function-docstring
def arcs_tool_recipe2plan_2(name, src, package):
    recipe2plan(
        name = name,
        src = src,
        package = package,
        compiler = "//java/arcs/tools:recipe2plan",
    )

# buildifier: disable=function-docstring
def arcs_tool_manifest2proto(name, srcs, outs, deps):
    sigh_command(
        name = name,
        srcs = srcs,
        outs = outs,
        deps = deps,
        progress_message = "Serializing manifest",
        sigh_cmd = "manifest2proto --quiet --outdir $(dirname {OUT}) --outfile $(basename {OUT}) {SRC}",
    )

# buildifier: disable=function-docstring
def arcs_tool_schema2wasm(name, srcs, outs, deps, language_name, language_flag, wasm, test_harness):
    # TODO: generated header guard should contain whole workspace-relative
    # path to file.
    sigh_cmd = "schema2wasm " + language_flag
    if wasm:
        sigh_cmd += " --wasm"
    if test_harness:
        sigh_cmd += " --test_harness"
    sigh_cmd += " --outdir $(dirname {OUT}) --outfile $(basename {OUT}) {SRC}"

    sigh_command(
        name = name,
        srcs = srcs,
        outs = outs,
        deps = deps,
        progress_message = "Generating %s entity schemas" % language_name,
        sigh_cmd = sigh_cmd,
    )

def arcs_tool_verify_policy(name, manifest_proto, policy_options_proto):
    """Creates a test to check that a recipe is compliant with policy."""
    run_test(
        name = name,
        test_binary = "//java/arcs/tools:verify_policy",
        test_args = [
            "--manifest",
            "$(rootpath %s)" % manifest_proto,
            "--options",
            "$(rootpath %s)" % policy_options_proto,
        ],
        data = [
            manifest_proto,
            policy_options_proto,
        ],
    )
