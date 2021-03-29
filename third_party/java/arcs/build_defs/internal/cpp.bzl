"""Rules for generating code from Arcs schemas.

Rules are re-exported in build_defs.bzl -- use those instead.
"""

load(":tools.oss.bzl", "arcs_tool_schema2wasm")
load(":util.bzl", "replace_arcs_suffix")

def arcs_cc_schema(name, src, deps = [], out = None):
    """Generates a C++ header file for the given .arcs schema file.

    Args:
      name: name of the target
      src: Arcs manifest file
      deps: C++ dependencies needed for generated code.
      out: (optional) Name of output file, `*.h`.
    """
    if not src.endswith(".arcs"):
        fail("src must be a .arcs file")

    if type(deps) == str:
        fail("deps must be a list")

    arcs_tool_schema2wasm(
        name = name,
        srcs = [src],
        outs = [out or replace_arcs_suffix(src, ".h")],
        deps = deps,
        language_name = "C++",
        language_flag = "--cpp",
        wasm = False,
        test_harness = False,
        type_slicing = False,
    )
