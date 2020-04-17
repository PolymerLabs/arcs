"""Rules that invoke sigh scripts."""

load("//third_party/java/arcs/build_defs:sigh.bzl", "sigh_command")
load(":manifest.bzl", "arcs_manifest")

def arcs_manifest_parse_test(name, srcs, deps = []):
    """Tests that Arcs manifest files parse correctly.

    Args:
      name: the name of the test target to create
      srcs: list of Arcs manifest files to test
      deps: list of dependencies (e.g. other imported manifest files, particle code, etc.)
    """
    for src in srcs:
        if not src.endswith(".arcs"):
            fail("src must be an .arcs manifest file, found %s" % src)

    manifest_name = name + "_sources"

    arcs_manifest(
        name = manifest_name,
        srcs = srcs,
        deps = deps,
    )

    test_args = " ".join(["$(location %s)" % src for src in srcs])

    sigh_command(
        name = name,
        srcs = srcs,
        deps = deps + [":" + manifest_name],
        sigh_cmd = "run manifestChecker " + test_args,
        progress_message = "Checking Arcs manifest",
        execute = False,
    )
