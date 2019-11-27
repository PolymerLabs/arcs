"""Arcs Kotlin WASM rules.

Rules are re-exported in build_defs.bzl -- use those instead.
"""

load("@rules_java//java:defs.bzl", "java_library")
load("//third_party/bazel_rules/rules_kotlin/kotlin/native:native_rules.bzl", "kt_native_binary", "kt_native_library")
load("//third_party/bazel_rules/rules_kotlin/kotlin/js:js_library.bzl", "kt_js_library")
load("//tools/build_defs/kotlin:rules.bzl", "kt_jvm_library")
load("//third_party/bazel_rules/rules_kotlin/kotlin/native:wasm.bzl", "wasm_kt_binary")

_ARCS_KOTLIN_LIBS = ["//third_party/java/arcs/sdk/kotlin:kotlin"]
_WASM_SUFFIX = "-wasm"
_JS_SUFFIX = "-js"
_KT_SUFFIX = "-kt"

IS_BAZEL = not (hasattr(native, "genmpm"))

def arcs_kt_library(name, srcs = [], deps = [], visibility = None):
    """Declares kotlin library targets for Kotlin particle sources."""
    kt_jvm_and_wasm_library(
        name = name,
        srcs = srcs,
        deps = _ARCS_KOTLIN_LIBS + deps,
    )

def arcs_kt_binary(name, srcs = [], deps = [], visibility = None):
    """Performs final compilation of wasm and bundling if necessary.

    Args:
      name: name of the target to create
      srcs: list of source files to include
      deps: list of dependencies
      visibility: list of visibilities
    """

    if srcs:
        libname = name + "_lib"

        # Declare a library because g3 kt_native_binary doesn't take srcs
        kt_native_library(
            name = libname + _WASM_SUFFIX,
            srcs = srcs,
            deps = [_to_wasm_dep(dep) for dep in _ARCS_KOTLIN_LIBS + deps],
            visibility = visibility,
        )

        deps = [":" + libname]

    kt_native_binary(
        name = name,
        entry_point = "arcs.main",
        deps = [_to_wasm_dep(dep) for dep in _ARCS_KOTLIN_LIBS + deps],
        tags = ["wasm"],
        visibility = visibility,
    )

    wasm_kt_binary(
        name = name + "_wasm",
        kt_target = ":" + name,
    )

def kt_jvm_and_wasm_library(
        name = None,
        srcs = [],
        deps = [],
        visibility = None,
        **kwargs):
    """Simultaneously defines JVM and WASM kotlin libraries.

    Args:
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

    kt_native_library(
        name = name + _WASM_SUFFIX,
        srcs = srcs,
        deps = [_to_wasm_dep(dep) for dep in deps],
        visibility = visibility,
        **kwargs
    )

def kt_jvm_and_js_library(
        name,
        srcs = [],
        deps = [],
        visibility = None,
        exports = [],
        **kwargs):
    """Simultaneously defines JVM and JS kotlin libraries.

    Args:
      name: String; Name of the library
      srcs: List; List of sources
      deps: List; List of dependencies
      exports: List; List of exported dependencies
      visibility: List; List of visibilities
      **kwargs: other arguments to forward to the kt_jvm_library and
        kt_js_library rules
    """

    kt_name = name
    js_name = "%s%s" % (name, _JS_SUFFIX)

    if exports:
        # kt_jvm_library doesn't support the "exports" property. Instead, we
        # will wrap it in a java_library rule and export everything that is
        # needed from there.
        kt_name = name + _KT_SUFFIX
        java_library(
            name = name,
            exports = exports + [kt_name],
            visibility = visibility,
        )

    kt_jvm_library(
        name = kt_name,
        srcs = srcs,
        deps = [_to_jvm_dep(dep) for dep in deps],
        visibility = visibility,
        **kwargs
    )

    if IS_BAZEL:
        js_kwargs = dict(**kwargs)
        kt_js_library(
            name = js_name,
            srcs = srcs,
            deps = [_to_js_dep(dep) for dep in deps],
            **js_kwargs
        )

def _to_wasm_dep(dep):
    last_part = dep.split("/")[-1]

    index_of_colon = dep.find(":")
    if (index_of_colon == -1):
        return dep + (":%s%s" % (last_part, _WASM_SUFFIX))
    else:
        return dep + _WASM_SUFFIX

def _to_jvm_dep(dep):
    return dep

def _to_js_dep(dep):
    last_part = dep.split("/")[-1]

    index_of_colon = dep.find(":")
    if (index_of_colon == -1):
        return dep + (":%s%s" % (last_part, _JS_SUFFIX))
    else:
        return dep + _JS_SUFFIX
