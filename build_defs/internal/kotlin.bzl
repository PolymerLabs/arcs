"""Arcs Kotlin WASM rules.

Rules are re-exported in build_defs.bzl -- use those instead.
"""

load("//build_defs/kotlin_native:build_defs.bzl", "kt_wasm_binary", "kt_wasm_library")
load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kt_android_library", "kt_js_library", "kt_jvm_library", "kt_js_import")

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
        deps = [_to_jvm_dep(dep) for dep in deps],
    )

    kt_js_library(
        name = "%s-js" % name,
        srcs = srcs,
        deps = [_to_js_dep(dep) for dep in deps],
    )

def _to_jvm_dep(dep):
    return dep

def _to_js_dep(dep):
    last_part = dep.split("/")[-1]

    if (dep.find("@maven") == 0):
        return _kt_js_import_for_thirdparty(dep)

    index_of_colon = dep.find(":")
    if (index_of_colon == -1):
        return dep + (":%s-js" % last_part)
    else:
        return dep + "-js"

def _kt_js_import_for_thirdparty(thirdparty_dep):
    name = "unknown"
    version = ""
    maven_name = "unknown"
    if (thirdparty_dep == "@maven//:org_jetbrains_kotlinx_kotlinx_coroutines_core"):
        name = "kotlinx-coroutines-core-js"
        version = "1.3.2"
        maven_name = "@maven//:org_jetbrains_kotlinx_kotlinx_coroutines_core_js"
    if (thirdparty_dep == "@maven//:org_jetbrains_kotlinx_atomicfu"):
        name = "atomicfu-js"
        version = "0.13.1"
        maven_name = "@maven//:org_jetbrains_kotlinx_atomicfu_js"

    kt_js_import(
        name = name,
        jars = [maven_name],
        srcjar = "%s-%s-sources.jar" % (version, name)
    )

    return ":%s" % name

