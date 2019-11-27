"""Arcs Kotlin WASM rules.

Rules are re-exported in build_defs.bzl -- use those instead.
"""

load("@rules_java//java:defs.bzl", "java_library", "java_test")
load("//third_party/bazel_rules/rules_kotlin/kotlin/js:js_library.bzl", "kt_js_library")
load("//third_party/bazel_rules/rules_kotlin/kotlin/native:native_rules.bzl", "kt_native_binary", "kt_native_library")
load("//third_party/bazel_rules/rules_kotlin/kotlin/native:wasm.bzl", "wasm_kt_binary")
load("//tools/build_defs/android:rules.bzl", "android_local_test")
load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library", "kt_jvm_library")

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
      **kwargs: other arguments to foward to the kt_jvm_library and
        kt_js_library rules
    """

    kt_name = name
    js_name = name + "-js"

    if exports:
        # kt_jvm_library doesn't support the "exports" property. Instead, we
        # will wrap it in a java_library rule and export everything that is
        # needed from there.
        kt_name = name + "-kt"
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
        if "exports" in js_kwargs:
            js_kwargs.pop("exports")
        kt_js_library(
            name = js_name,
            srcs = srcs,
            deps = [_to_js_dep(dep) for dep in deps],
            **js_kwargs
        )

def arcs_kt_android_test_suite(name, manifest, package, srcs = None, deps = []):
    """Defines Kotlin Android test targets for a directory.

    Defines a Kotlin Android library (kt_android_library) for all of the sources
    in the current directory, and then defines an Android test target
    (android_local_test) for each individual test file.

    Args:
      name: name to use for the kt_android_library target
      manifest: label of the Android manifest file to use
      package: package the test classes are in
      srcs: Optional list of source files. If not supplied, a glob of all *.kt
        files will be used.
      deps: list of dependencies for the kt_android_library
    """
    if not srcs:
        srcs = native.glob(["*.kt"])

    kt_android_library(
        name = name,
        srcs = native.glob(["*.kt"]),
        manifest = manifest,
        testonly = True,
        deps = deps,
    )

    for src in native.glob(["*.kt"]):
        class_name = src[:-3]
        android_local_test(
            name = class_name,
            size = "small",
            manifest = manifest,
            test_class = "%s.%s" % (package, class_name),
            deps = [
                ":%s" % name,
                "@robolectric//bazel:android-all",
            ],
        )

def arcs_kt_jvm_test_suite(name, package, srcs = None, deps = []):
    """Defines Kotlin JVM test targets for a directory.

    Defines a Kotlin JVM library (kt_jvm_library) for all of the sources
    in the current directory, and then defines an JVM test target (java_test)
    for each individual test file.

    Args:
      name: name to use for the kt_jvm_library target
      package: package the test classes are in
      srcs: Optional list of source files. If not supplied, a glob of all *.kt
        files will be used.
      deps: list of dependencies for the kt_jvm_library
    """
    if not srcs:
        srcs = native.glob(["*.kt"])

    kt_jvm_library(
        name = name,
        srcs = srcs,
        testonly = True,
        deps = deps,
    )

    for src in srcs:
        class_name = src[:-3]
        java_test(
            name = class_name,
            size = "small",
            test_class = "%s.%s" % (package, class_name),
            runtime_deps = [
                ":%s" % name,
                "@robolectric//bazel:android-all",
            ],
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
