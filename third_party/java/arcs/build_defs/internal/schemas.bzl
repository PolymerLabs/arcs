"""Rules for generating code from Arcs schemas.

Rules are re-exported in build_defs.bzl -- use those instead.
"""

load("//third_party/java/arcs/build_defs:sigh.bzl", "sigh_command")
load("//third_party/java/arcs/build_defs/internal:util.bzl", "replace_arcs_suffix")
load(":kotlin.bzl", "ARCS_SDK_DEPS", "arcs_kt_library")

ARCS_DATA_DEPS = ["//third_party/java/arcs:arcs-core-data"]

def _run_schema2wasm(
        name,
        src,
        deps,
        out,
        language_name,
        language_flag,
        package,
        wasm):
    """Generates source code for the given .arcs schema file.

    Runs sigh schema2wasm to generate the output.
    """

    if not src.endswith(".arcs"):
        fail("src must be a .arcs file")

    if type(deps) == str:
        fail("deps must be a list")

    sigh_command(
        name = name,
        srcs = [src],
        outs = [out],
        deps = deps,
        progress_message = "Generating {} entity schemas".format(language_name),

        # TODO: generated header guard should contain whole workspace-relative
        # path to file.
        sigh_cmd = "schema2wasm " +
                   language_flag + " " +
                   ("--wasm " if wasm else "") +
                   "--outdir $(dirname {OUT}) " +
                   "--outfile $(basename {OUT}) " +
                   "--package " + package + " " +
                   "{SRC}",
    )

# TODO: Specify the appropriate c++ package name, given the new repo structure
def arcs_cc_schema(name, src, deps = [], out = None, package = "arcs"):
    """Generates a C++ header file for the given .arcs schema file."""
    _run_schema2wasm(
        name = name + "_genrule",
        src = src,
        deps = deps,
        out = out or replace_arcs_suffix(src, ".h"),
        language_flag = "--cpp",
        language_name = "C++",
        wasm = False,
        package = package,
    )

def arcs_kt_schema(name, srcs, deps = [], package = "arcs.sdk"):
    """Generates a Kotlin file for the given .arcs schema file.

    Args:
      name: name of the target to create
      srcs: list of Arcs manifest files to include
      deps: list of imported manifests
      package: package name to use for the generated source code
    """
    outs = []
    for src in srcs:
        for wasm in [True, False]:
            ext = "wasm" if wasm else "jvm"
            genrule_name = replace_arcs_suffix(src, "_genrule_" + ext)
            out = replace_arcs_suffix(src, "_GeneratedSchemas.%s.kt" % ext)
            outs.append(out)
            _run_schema2wasm(
                name = genrule_name,
                src = src,
                out = out,
                deps = deps,
                wasm = wasm,
                language_flag = "--kotlin",
                language_name = "Kotlin",
                package = package,
            )

    arcs_kt_library(
        name = name,
        srcs = outs,
        platforms = ["jvm", "wasm"],
        deps = ARCS_SDK_DEPS + ARCS_DATA_DEPS,
    )
