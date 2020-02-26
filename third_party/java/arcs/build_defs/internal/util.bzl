"""Shared utilities for Arcs internal rules"""

def output_name(src, suffix = ""):
    """Cleans up the given file name, and replaces the .arcs extension."""

    # For references to files in other build targets, extract the filename:
    #   //src/wasm/tests:manifest.arcs -> manifest.arcs
    if src.startswith("//"):
        src = src.split(":")[1]
    return src.replace(".arcs", "").replace("_", "-").replace(".", "-") + suffix
