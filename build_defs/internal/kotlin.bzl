"""Arcs Kotlin WASM rules.

Rules are re-exported in build_defs.bzl -- use those instead.
"""

load("//build_defs/kotlin_native:build_defs.bzl", "kt_wasm_binary", "kt_wasm_library")
load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kt_android_library")

_ARCS_KOTLIN_LIBS = ["//src/wasm/kotlin:arcs_wasm"]

def arcs_kt_library(name, srcs = [], deps = []):
    """Declares kotlin library targets for Kotlin particle sources."""
    kt_wasm_library(
        name = name,
        srcs = srcs,
        deps = _ARCS_KOTLIN_LIBS + deps,
    )

def arcs_kt_binary(name, srcs = [], deps = []):
    """Performs final compilation of wasm and bundling if necessary."""
    kt_wasm_binary(
        name = name,
        srcs = srcs,
        deps = _ARCS_KOTLIN_LIBS + deps,
    )
