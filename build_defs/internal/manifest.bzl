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

def arcs_manifest_bundle(name, deps):
    """Bundles up a number of arcs_manifest rules into a single filegroup.

    This lets you include multiple different manifests in, e.g., your Android
    assets folder. Also generates a root manifest which imports all the other
    manifests.

    TODO: Perform dataflow analysis on the resulting root manifest.
    """

    out = name + ".arcs"

    # Command to generate the root manifest.
    cmd = [
        # Invoke generator script.
        "$(location //src/tools:generate_root_manifest)",
        # First arg is the BUILD rule which generated the manifest.
        "//%s:%s" % (native.package_name(), name),
    ]

    # Rest of args are files to include in the root manifest.
    cmd += ["$(locations %s)" % dep for dep in deps]
    cmd.append("> $@")

    native.genrule(
        name = name + "_genrule",
        srcs = deps,
        outs = [out],
        cmd = " ".join(cmd),
        tools = ["//src/tools:generate_root_manifest"],
    )

    # Bundle the root manifest together with all the deps.
    native.filegroup(
        name = name,
        srcs = [out] + deps,
    )
