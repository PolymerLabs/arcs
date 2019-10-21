"""Arcs manifest bundling rules."""

def arcs_manifest(name, srcs, deps = []):
    """Bundles .arcs manifest files with their particle implementations.

    Generates a filegroup that can be included in e.g. an Android assets folder.

    TODO: Check that all the files referenced in the manifest files are included
    (i.e. .wasm and .js particle implementations, and json data files).
    """
    for src in srcs:
        if not src.endswith(".arcs"):
            fail("srcs can only contain .arcs manifest files.")

    native.filegroup(
        name = name,
        srcs = srcs + deps,
    )

    # TODO: Add a test to check that all required data files are included in
    # deps.
