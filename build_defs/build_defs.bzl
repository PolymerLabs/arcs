"""Arcs BUILD rules."""

load(":sigh.bzl", "sigh_command")
load(
    "//build_defs/internal:kotlin.bzl",
    _arcs_kt_binary = "arcs_kt_binary",
    _arcs_kt_library = "arcs_kt_library",
    _kt_jvm_and_js_library = "kt_jvm_and_js_library",
)
load(
    "//build_defs/internal:manifest.bzl",
    _arcs_manifest = "arcs_manifest",
    _arcs_manifest_bundle = "arcs_manifest_bundle",
)
load(
    "//build_defs/internal:schemas.bzl",
    _arcs_cc_schema = "arcs_cc_schema",
    _arcs_kt_schema = "arcs_kt_schema",
)

# Re-export rules from various other files.

arcs_cc_schema = _arcs_cc_schema

arcs_kt_schema = _arcs_kt_schema

arcs_kt_library = _arcs_kt_library

arcs_kt_binary = _arcs_kt_binary

arcs_manifest = _arcs_manifest

arcs_manifest_bundle = _arcs_manifest_bundle

kt_jvm_and_js_library = _kt_jvm_and_js_library

def arcs_ts_test(name, src, deps):
    """Runs a TypeScript test file using `sigh test`."""
    sigh_command(
        name = name,
        srcs = [src],
        execute = False,
        sigh_cmd = "test --bazel --file {SRC}",
        deps = deps,
    )
