load(":run_in_repo.bzl", "run_in_repo")


def _title_case(name):
    return name[0].upper() + name[1:]

def _arcs_schema(name, src, target, out):
    """Generates entities in a supported target language via sigh schema2pkg.
    """
    supported = ['kotlin', 'cpp']

    if not src.endswith(".arcs"):
        fail("src must be a .arcs file")

    if target.lower() not in supported:
        fail("target must be one of: [{0}]".format(", ".join(supported)))

    run_in_repo(
        name = name,
        srcs = [src],
        outs = [out],
        # TODO: generated header guard should contain whole workspace-relative
        # path to file.
        cmd = "./tools/sigh schema2pkg  --{0}" +
              "--outdir $(dirname {OUT}) " +
              "--outfile $(basename {OUT}) " +
              "{SRC}".format(target.lower()),
        progress_message = "Generating {0} entity schemas".format(_title_case(target)),
    )

def arcs_cc_schema(name, src, out = None):
    """Generates a C++ header file for the given .arcs schema file.

    Runs sigh schema2pkg to generate the output.
    """
    if out == None:
        # Clean up the output name.
        out = src.replace(".arcs", "").replace("_", "-").replace(".", "-") + ".h"

    _arcs_schema(name, src, 'cpp', out)

def arcs_kt_schema(name, src, out = None):
    """Generates dataclasses in a Kotlin file for the given .arcs schema file.

    Runs sigh schema2pkg to generate the output.
    """
    if out == None:
        # Clean up the output name.
        parts = src.replace(".arcs", "").replace("_", "-").replace(".", "-") .split('-')
        out = "".join([_title_case(p) for p in parts]) + ".kt"

    _arcs_schema(name, src, 'kotlin', out)
