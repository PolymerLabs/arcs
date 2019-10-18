"""Rules for generating code from Arcs schemas.

Rules are re-exported in build_defs.bzl -- use those instead.
"""

load(":run_in_repo.bzl", "run_in_repo")

def _output_name(src, file_extension = ""):
    return src.replace(".arcs", "").replace("_", "-").replace(".", "-") + file_extension

def _run_schema2pkg(name, src, out, language_name, language_flag, file_extension):
    """Generates source code for the given .arcs schema file.

    Runs sigh schema2pkg to generate the output.
    """

    if not src.endswith(".arcs"):
        fail("src must be a .arcs file")

    if out == None:
        # Clean up the output name.
        out = _output_name(src, file_extension)

    run_in_repo(
        name = name,
        srcs = [src],
        outs = [out],
        deps = ["//src/tools:schema2pkg_srcs"],
        # TODO: generated header guard should contain whole workspace-relative
        # path to file.
        cmd = "./tools/sigh schema2pkg " +
              language_flag + " " +
              "--outdir $(dirname {OUT}) " +
              "--outfile $(basename {OUT}) " +
              "{SRC}",
        progress_message = "Generating {} entity schemas".format(language_name),
    )

def arcs_cc_schema(name, src, out = None):
    """Generates a C++ header file for the given .arcs schema file."""
    _run_schema2pkg(
        name = name,
        src = src,
        out = out,
        language_name = "C++",
        language_flag = "--cpp",
        file_extension = ".h",
    )

def arcs_kt_schema(name, src, out = None, deps = [], wasm_deps = []):
    """Generates a Kotlin file for the given .arcs schema file."""
    out = out or _output_name(src, "_GeneratedSchemas.kt")
    _run_schema2pkg(
        name = name + "_genrule",
        src = src,
        out = out,
        language_name = "Kotlin",
        language_flag = "--kotlin",
        file_extension = ".kt",
    )

    return out