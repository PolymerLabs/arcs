"""Rules for generating code from Arcs schemas.

Rules are re-exported in build_defs.bzl -- use those instead.
"""

load("//third_party/java/arcs/build_defs:sigh.bzl", "sigh_command")
load(":kotlin.bzl", "arcs_kt_library")

def _output_name(src, file_extension = ""):
    """Cleans up the given file name, and replaces the .arcs extension."""
    return src.replace(".arcs", "").replace("_", "-").replace(".", "-") + file_extension

def _run_schema2wasm(name, src, out, language_name, language_flag, package):
    """Generates source code for the given .arcs schema file.

    Runs sigh schema2wasm to generate the output.
    """

    if not src.endswith(".arcs"):
        fail("src must be a .arcs file")

    sigh_command(
        name = name,
        srcs = [src],
        outs = [out],
        progress_message = "Generating {} entity schemas".format(language_name),

        # TODO: generated header guard should contain whole workspace-relative
        # path to file.
        sigh_cmd = "schema2wasm " +
                   language_flag + " " +
                   "--outdir $(dirname {OUT}) " +
                   "--outfile $(basename {OUT}) " +
                   "--package " + package + " " +
                   "{SRC}",
    )

def arcs_cc_schema(name, src, out = None, package = "arcs"):
    """Generates a C++ header file for the given .arcs schema file."""
    out = out or _output_name(src, ".h")
    _run_schema2wasm(
        name = name + "_genrule",
        src = src,
        out = out,
        language_flag = "--cpp",
        language_name = "C++",
        package = package,
    )

def arcs_kt_schema(name, srcs, package = "arcs"):
    """Generates a Kotlin file for the given .arcs schema file.

    Args:
      name: name of the target to create
      srcs: list of Arcs manifest files to include
      package: package name to use for the generated source code
    """
    outs = []
    for src in srcs:
        out = _output_name(src, "_GeneratedSchemas.kt")
        outs.append(out)
        _run_schema2wasm(
            name = _output_name(src) + "_genrule",
            src = src,
            out = out,
            language_flag = "--kotlin",
            language_name = "Kotlin",
            package = package,
        )

    arcs_kt_library(
        name = name,
        srcs = outs,
        deps = [],
    )
