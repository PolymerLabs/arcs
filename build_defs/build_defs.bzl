"""Arcs BUILD rules."""

load(":run_in_repo.bzl", "EXECUTION_REQUIREMENTS_TAGS", "run_in_repo_test")
load("//build_defs/internal:kotlin.bzl", _arcs_kt_binary = "arcs_kt_binary", _arcs_kt_library = "arcs_kt_library")
load("//build_defs/internal:manifest.bzl", _arcs_manifest = "arcs_manifest")
load("//build_defs/internal:schemas.bzl", _arcs_cc_schema = "arcs_cc_schema", _arcs_kt_schema = "arcs_kt_schema")
load("//build_defs:sigh.bzl", "sigh_command")

# Re-export rules from various other files.
arcs_cc_schema = _arcs_cc_schema

arcs_kt_schema = _arcs_kt_schema

arcs_kt_library = _arcs_kt_library

arcs_kt_binary = _arcs_kt_binary
arcs_manifest = _arcs_manifest

def arcs_ts_test(name, src, deps):
    """Runs a TypeScript test file using `sigh test`."""
    sigh_command(
        name = name,
        srcs = [src],
        execute = False,
        sigh_cmd = "test --bazel --file {SRC}",
        deps = deps,
    )
