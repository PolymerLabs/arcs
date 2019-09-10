load(":run_in_repo.bzl", "EXECUTION_REQUIREMENTS_TAGS", "run_in_repo", "run_in_repo_test")

def arcs_cc_schema(name, src, out = None):
    """Generates a C++ header file for the given .arcs schema file.

    Runs sigh schema2pkg to generate the output.
    """

    if not src.endswith(".arcs"):
        fail("src must be a .arcs file")

    if out == None:
        # Clean up the output name.
        out = src.replace(".arcs", "").replace("_", "-").replace(".", "-") + ".h"

    run_in_repo(
        name = name,
        srcs = [src],
        outs = [out],
        # TODO: generated header guard should contain whole workspace-relative
        # path to file.
        cmd = "./tools/sigh schema2pkg --cpp " +
              "--outdir $(dirname {OUT}) " +
              "--outfile $(basename {OUT}) " +
              "{SRC}",
        progress_message = "Generating C++ entity schemas",
    )

def arcs_ts_test(name, src, deps):
    """Runs a TypeScript test file using `sigh test`."""
    run_in_repo_test(
        name = name,
        srcs = [src],
        cmd = "./tools/sigh test --bazel --file {SRC}",
        tags = EXECUTION_REQUIREMENTS_TAGS,
        deps = deps,
    )
