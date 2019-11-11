"""Arcs Kotlin WASM rules.

Rules are re-exported in build_defs.bzl -- use those instead.
"""

load("//third_party/bazel_rules/rules_kotlin/kotlin/native:native_rules.bzl", "kt_native_binary", "kt_native_library")
load("//third_party/bazel_rules/rules_kotlin/kotlin/js:js_library.bzl", "kt_js_library", kt_js_import = "kt_js_import_fixed")
load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")
load("//third_party/bazel_rules/rules_kotlin/kotlin/native:wasm.bzl", "wasm_kt_binary")

_ARCS_KOTLIN_LIBS = ["//third_party/java/arcs/sdk/kotlin"]

IS_BAZEL = not (hasattr(native, "genmpm"))

def arcs_kt_library(name, srcs = [], deps = [], visibility = None):
    """Declares kotlin library targets for Kotlin particle sources."""
    kt_native_library(
        name = name,
        srcs = srcs,
        deps = _ARCS_KOTLIN_LIBS + deps,
        visibility = visibility,
    )

def arcs_kt_binary(name, srcs = [], deps = [], visibility = None):
    """Performs final compilation of wasm and bundling if necessary."""

    if srcs:
        libname = name + "_lib"

        # Declare a library because g3 kt_native_binary doesn't take srcs
        kt_native_library(
            name = libname,
            srcs = srcs,
            deps = _ARCS_KOTLIN_LIBS + deps,
            visibility = visibility,
        )

        deps = [":" + libname]

    kt_native_binary(
        name = name,
        entry_point = "arcs.main",
        deps = _ARCS_KOTLIN_LIBS + deps,
        tags = ["wasm"],
        visibility = visibility,
    )

    wasm_kt_binary(
        name = name + "_wasm",
        kt_target = ":" + name,
    )

def kt_jvm_and_js_library(
        name = None,
        srcs = [],
        deps = [],
        visibility = None,
        **kwargs):
    """Simultaneously defines JVM and JS kotlin libraries.
    name: String; Name of the library
    srcs: List; List of sources
    deps: List; List of dependencies
    visibility: List; List of visibilities
    """
    kt_jvm_library(
        name = name,
        srcs = srcs,
        deps = [_to_jvm_dep(dep) for dep in deps],
        visibility = visibility,
        **kwargs
    )

    if IS_BAZEL:
        js_kwargs = dict(**kwargs)
        if "exports" in js_kwargs:
            js_kwargs.pop("exports")
        kt_js_library(
            name = "%s-js" % name,
            srcs = srcs,
            deps = [_to_js_dep(dep) for dep in deps],
            **js_kwargs
        )

def _to_jvm_dep(dep):
    return dep

def _to_js_dep(dep):
    last_part = dep.split("/")[-1]

    index_of_colon = dep.find(":")
    if (index_of_colon == -1):
        return dep + (":%s-js" % last_part)
    else:
        return dep + "-js"
