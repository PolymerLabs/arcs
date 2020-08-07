"""Shared utilities for Arcs internal rules"""

load("//tools/build_defs/build_test:build_test.bzl", "build_test")

def replace_arcs_suffix(src, suffix = ""):
    """Cleans up the given file name, and replaces the .arcs extension with the provided suffix."""

    # For references to files in other build targets, extract the filename:
    #   //src/wasm/tests:manifest.arcs -> manifest.arcs
    if src.startswith("//"):
        src = src.split(":")[1]
    return src.replace(".arcs", "").replace("_", "-").replace(".", "-") + suffix

def merge_lists(*lists):
    """Merges the given lists, ignoring duplicate entries.

    Args:
      *lists: lists of strings to merge
    Returns:
      A list of strings
    """
    result = {}
    for x in lists:
        for elem in x:
            result[elem] = 1
    return result.keys()

def manifest_only(deps = [], inverse = False):
    """Returns only .arcs files"""
    if inverse:
        return [d for d in deps if not d.endswith(".arcs")]
    return [d for d in deps if d.endswith(".arcs")]

def create_build_test(name):
    """Creates a build_test for the given target.

    Build tests are useful mainly for the internal presubmit, to verify that
    everything builds without error.
    """
    build_test(
        name = name + "_build_test",
        targets = [":" + name],
    )
