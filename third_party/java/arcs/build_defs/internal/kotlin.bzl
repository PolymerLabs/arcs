"""Arcs Kotlin WASM rules.

Rules are re-exported in build_defs.bzl -- use those instead.
"""

load("//third_party/bazel_rules/rules_kotlin/kotlin/native:native_rules.bzl", "kt_native_binary", "kt_native_library")
load("//third_party/bazel_rules/rules_kotlin/kotlin/js:js_library.bzl", "kt_js_library", kt_js_import = "kt_js_import_fixed")
load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library", "kt_jvm_library")

_ARCS_KOTLIN_LIBS = ["//third_party/java/arcs/kotlin:arcs_wasm"]

IS_BAZEL = not (hasattr(native, "genmpm"))

def arcs_kt_library(name, srcs = [], deps = []):
    """Declares kotlin library targets for Kotlin particle sources."""
    kt_native_library(
        name = name,
        srcs = srcs,
        deps = _ARCS_KOTLIN_LIBS + deps,
    )

def arcs_kt_binary(name, srcs = [], deps = []):
    """Performs final compilation of wasm and bundling if necessary."""
    libname = name + "_lib"

    # Declare a library because g3 kt_native_binary doesn't take srcs
    kt_native_library(
        name = libname,
        srcs = srcs,
        deps = _ARCS_KOTLIN_LIBS + deps,
        tags = ["wasm"],
    )

    kt_native_binary(
        name = name,
        entry_point = "arcs.main",
        deps = _ARCS_KOTLIN_LIBS + [":%s" % libname] + deps,
        tags = ["wasm"],
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
        deps = [_to_jvm_dep(dep) for dep in deps],
    )

    if IS_BAZEL:
        kt_js_library(
            name = "%s-js" % name,
            srcs = srcs,
            deps = [_to_js_dep(dep) for dep in deps],
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
