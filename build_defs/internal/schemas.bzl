"""Rules for generating code from Arcs schemas.

Rules are re-exported in build_defs.bzl -- use those instead.
"""

load("//build_defs:run_in_repo.bzl", "run_in_repo")
load(":kotlin.bzl", "arcs_kt_library")

def _output_name(src, file_extension = ""):
    """Cleans up the given file name, and replaces the .arcs extension."""
    return src.replace(".arcs", "").replace("_", "-").replace(".", "-") + file_extension

def _run_schema2pkg(name, src, out, language_name, language_flag):
    """Generates source code for the given .arcs schema file.

    Runs sigh schema2pkg to generate the output.
    """

    if not src.endswith(".arcs"):
        fail("src must be a .arcs file")

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
    out = out or _output_name(src, ".h")
    _run_schema2pkg(
        name = name + "_genrule",
        src = src,
        out = out,
        language_name = "C++",
        language_flag = "--cpp",
    )

def arcs_kt_schema(name, srcs):
    """Generates a Kotlin file for the given .arcs schema file."""
    outs = []
    for src in srcs:
      out = _output_name(src, "_GeneratedSchemas.kt")
      outs.append(out)
      _run_schema2pkg(
          name = _output_name(src) + "_genrule",
          src = src,
          out = out,
          language_name = "Kotlin",
          language_flag = "--kotlin",
      )
    
    arcs_kt_library(
        name = name,
        srcs = outs,
        deps = [],
    )
