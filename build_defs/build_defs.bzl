"""Arcs BUILD rules."""

load(":run_in_repo.bzl", "EXECUTION_REQUIREMENTS_TAGS", "run_in_repo_test")
load("//build_defs/internal:kotlin.bzl", _arcs_kt_binary = "arcs_kt_binary", _arcs_kt_library = "arcs_kt_library")
load("//build_defs/internal:manifest.bzl", _arcs_manifest = "arcs_manifest")
load("//build_defs/internal:schemas.bzl", _arcs_cc_schema = "arcs_cc_schema", _arcs_kt_schema = "arcs_kt_schema")

# Re-export rules from various other files.
arcs_cc_schema = _arcs_cc_schema
arcs_kt_schema = _arcs_kt_schema
arcs_kt_library = _arcs_kt_library
arcs_kt_binary = _arcs_kt_binary
arcs_manifest = _arcs_manifest

def arcs_ts_test(name, src, deps):
    """Runs a TypeScript test file using `sigh test`."""
    run_in_repo_test(
        name = name,
        srcs = [src],
        cmd = "$(location //tools:sigh_bin) test --bazel --file {SRC}",
        tags = EXECUTION_REQUIREMENTS_TAGS,
        deps = deps + [
            "//:all_srcs",
            "//tools:sigh_bin",
            "//tools:tools_srcs",
            "//:node_modules",
            "//:tsconfig"
        ],
    )
