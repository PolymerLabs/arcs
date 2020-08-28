"""Rules for generating code from Arcs schemas.

Rules are re-exported in build_defs.bzl -- use those instead.
"""

load(":tools.oss.bzl", "arcs_tool_schema2wasm")
load(":util.bzl", "replace_arcs_suffix")

def run_schema2wasm(
        name,
        src,
        deps,
        out,
        language_name,
        language_flag,
        wasm,
        test_harness = False):
    """Generates source code for the given .arcs schema file.

    Runs sigh schema2wasm to generate the output.
    """

    if not src.endswith(".arcs"):
        fail("src must be a .arcs file")

    if type(deps) == str:
        fail("deps must be a list")

    arcs_tool_schema2wasm(
        name = name,
        srcs = [src],
        outs = [out],
        deps = deps,
        language_name = language_name,
        language_flag = language_flag,
        wasm = wasm,
        test_harness = test_harness,
    )

def arcs_cc_schema(name, src, deps = [], out = None):
    """Generates a C++ header file for the given .arcs schema file."""
    run_schema2wasm(
        name = name + "_genrule",
        src = src,
        deps = deps,
        out = out or replace_arcs_suffix(src, ".h"),
        language_flag = "--cpp",
        language_name = "C++",
        wasm = False,
    )
