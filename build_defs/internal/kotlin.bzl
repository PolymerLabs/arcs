"""Arcs Kotlin WASM rules.

Rules are re-exported in build_defs.bzl -- use those instead.
"""

load("//build_defs/kotlin_native:build_defs.bzl", "kt_wasm_binary", "kt_wasm_library")
load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kt_android_library", "kt_js_library", "kt_jvm_library")

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

def kt_jvm_and_js_library(
        name = None,
        srcs = [],
        deps = []):
    """Simultaneously defines JVM and JS kotlin libraries.
    name: String; Name of the library
    srcs: List; List of sources
    deps: List; List of dependencies
    """
    kt_jvm_library(
        name = name,
        srcs = srcs,
        deps = deps,
    )

    kt_js_library(
        name = "%s-js" % name,
        srcs = srcs,
        deps = [_to_js_dep(dep) for dep in deps],
    )

def _to_js_dep(dep):
    last_part = dep.split("/")[-1]

    index_of_colon = dep.find(":")
    if (index_of_colon == -1):
        return dep + (":%s-js" % last_part)
    else:
        return dep + "-js"
