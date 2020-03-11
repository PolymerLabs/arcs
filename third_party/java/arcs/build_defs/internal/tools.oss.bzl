"""Rules that invoke sigh scripts."""

load("//third_party/java/arcs/build_defs:sigh.bzl", "sigh_command")

def arcs_manifest_parse_test(name, srcs, deps = []):
    """Tests that Arcs manifest files parse correctly.

    Args:
      name: the name of the test target to create
      srcs: list of Arcs manifest files to test
      deps: list of dependencies (e.g. other imported manifest files)
    """

    test_args = " ".join(["--src $(location %s)" % src for src in srcs])

    sigh_command(
        name = name,
        srcs = srcs,
        deps = deps,
        sigh_cmd = "run manifestChecker " + test_args,
        progress_message = "Checking Arcs manifest",
        execute = False,
    )
