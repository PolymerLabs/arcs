"""Arcs manifest bundling rules."""

load("//build_defs:sigh.bzl", "sigh_command")

def arcs_manifest(name, srcs, deps = []):
    """Bundles .arcs manifest files with their particle implementations.

    Generates a filegroup that can be included in e.g. an Android assets folder.
    """
    for src in srcs:
        if not src.endswith(".arcs"):
            fail("src must be an .arcs manifest file, found %s" % src)

    # All the files that need to go in the filegroup.
    all_files = srcs + deps

    native.filegroup(
        name = name,
        srcs = all_files,
    )

    test_args = " ".join(["--src $(location %s)" % src for src in srcs])

    sigh_command(
        name = name + "_test",
        srcs = all_files,
        sigh_cmd = "run manifestChecker " + test_args,
        deps = [name],
        progress_message = "Checking Arcs manifest",
        execute = False,
    )
