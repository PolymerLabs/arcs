"""Arcs BUILD rules."""

load(":run_in_repo.bzl", "EXECUTION_REQUIREMENTS_TAGS", "run_in_repo_test")
load(":schemas.bzl", _arcs_cc_schema = "arcs_cc_schema", _arcs_kt_schema = "arcs_kt_schema")
load(":kotlin.bzl", _arcs_kt_wasm_binary = "arcs_kt_wasm_binary", _arcs_kt_particle = "arcs_kt_particle", _arcs_manifest = "arcs_manifest")
 
# Re-export rules from various other files.
arcs_cc_schema = _arcs_cc_schema
arcs_kt_schema = _arcs_kt_schema
arcs_kt_wasm_binary = _arcs_kt_wasm_binary
arcs_kt_particle = _arcs_kt_particle
arcs_manifest = _arcs_manifest

def arcs_ts_test(name, src, deps):
    """Runs a TypeScript test file using `sigh test`."""
    run_in_repo_test(
        name = name,
        srcs = [src],
        cmd = "./tools/sigh test --bazel --file {SRC}",
        tags = EXECUTION_REQUIREMENTS_TAGS,
        deps = deps + ["//src:core_srcs"],
    )
