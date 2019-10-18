"""Arcs Kotlin rules.

Rules are re-exported in build_defs.bzl -- use those instead.
"""

load(":schemas.bzl", "arcs_kt_schema")
load("//build_defs/kotlin_native:build_defs.bzl", "kt_wasm_binary", "kt_wasm_library")
load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kt_android_library")

_ANDROID_TARGETS = False

def _output_name(src, file_extension = ""):
    return src.replace(".arcs", "").replace("_", "-").replace(".", "-") + file_extension

def _android_name(name):
    return name + "_android"

def _android_deps(deps):
    return [_android_name(dep) for dep in deps]

def _wasm_name(name):
    return name + "_wasm"

def _wasm_deps(deps):
    return [_wasm_name(dep) for dep in deps]

def _android_and_wasm_library(name, srcs, deps):
    if _ANDROID_TARGETS:
      kt_android_library(
          name = _android_name(name),
          srcs = srcs,
          deps = _android_deps(deps)
      )

    kt_wasm_library(
        name = _wasm_name(name),
        srcs = srcs,
        deps = _wasm_deps(deps)
    )

def arcs_manifest(name, srcs, deps = []):
    """Generates Kotlin+Wasm Library targets from .arcs file translated to Kotlin."""
    # TODO: when converted to rule()+provider() verify deps are arcs_manifest rules
    outs = [arcs_kt_schema(_output_name(src), src, deps) for src in srcs]
    deps = ["//src/wasm/kotlin:arcs"] + deps

    _android_and_wasm_library(
        name,
        outs,
        deps
    )

def arcs_kt_particle(name, srcs, deps = []):
    """Declares kotlin library targets for Kotlin particle sources."""
    _android_and_wasm_library(name, srcs, ["//src/wasm/kotlin:arcs"] + deps)

def arcs_kt_wasm_binary(name, deps):
    """Performs final compilation of wasm and bundling if necessary."""
    # TODO: add bundling step
    kt_wasm_binary(name = name, srcs = [], deps = _wasm_deps(deps))