"""Arcs Kotlin WASM rules.

Rules are re-exported in build_defs.bzl -- use those instead.
"""

load("//third_party/bazel_rules/rules_kotlin/kotlin/js:js_library.bzl", "kt_js_library")
load("//third_party/bazel_rules/rules_kotlin/kotlin/native:native_rules.bzl", "kt_native_binary", "kt_native_library")
load("//third_party/bazel_rules/rules_kotlin/kotlin/native:wasm.bzl", "wasm_kt_binary")
load("//third_party/java/arcs/build_defs:native.oss.bzl", "java_library", "java_test")
load("//tools/build_defs/android:rules.bzl", "android_local_test")
load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library", "kt_jvm_library")

_ARCS_KOTLIN_LIBS = ["//third_party/java/arcs/sdk/kotlin:kotlin"]
_WASM_SUFFIX = "-wasm"
_JS_SUFFIX = "-js"
_KT_SUFFIX = "-kt"

IS_BAZEL = not (hasattr(native, "genmpm"))

def arcs_kt_jvm_library(**kwargs):
    if not IS_BAZEL:
        kwargs["disable_lint_checks"] = [
            "PackageName",
            "TopLevelName",
        ]
    kt_jvm_library(**kwargs)

def arcs_kt_library(name, srcs = [], deps = [], visibility = None):
    """Declares kotlin library targets for Kotlin particle sources."""
    kt_jvm_and_wasm_library(
        name = name,
        srcs = srcs,
        deps = _ARCS_KOTLIN_LIBS + deps,
        visibility = visibility,
    )

def arcs_kt_particles(name, srcs = [], deps = [], visibility = None):
    """Performs final compilation of wasm and bundling if necessary.

    Args:
      name: name of the target to create
      srcs: List of source files to include. Each file must contain a Kotlin
        class of the same name, which must match the name of a particle defined
        in a .arcs file.
      deps: list of dependencies
      visibility: list of visibilities
    """
    deps = _ARCS_KOTLIN_LIBS + deps
    wasm_deps = [_to_wasm_dep(dep) for dep in deps]

    # Create a library for each particle.
    wasm_particle_libs = []
    for src in srcs:
        if not src.endswith(".kt"):
            fail("%s is not a Kotlin file (must end in .kt)" % src)
        particle = src[:-3]
        wasm_lib = particle + "-lib" + _WASM_SUFFIX
        kt_native_library(
            name = wasm_lib,
            srcs = [src],
            deps = wasm_deps,
        )
        wasm_particle_libs.append(wasm_lib)

    # Create a kt_native_binary that groups everything together.
    native_binary_name = name + _WASM_SUFFIX
    kt_native_binary(
        name = native_binary_name,
        entry_point = "arcs.main",
        deps = wasm_particle_libs,
        # Don't build this manually. Build the wasm_kt_binary rule below
        # instead; otherwise this rule will build a non-wasm binary.
        tags = ["manual", "notap"],
    )

    # Create a wasm binary from the native binary.
    wasm_kt_binary(
        name = name,
        kt_target = ":" + native_binary_name,
        visibility = visibility,
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
      **kwargs: other arguments to feed into kt_jvm_library and kt_native_library
    """
    arcs_kt_jvm_library(
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

    arcs_kt_jvm_library(
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

def arcs_kt_android_test_suite(name, manifest, package, srcs = None, tags = [], deps = []):
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
      tags: optional list of tags for the test targets
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
            tags = tags,
            deps = [
                ":%s" % name,
                "@robolectric//bazel:android-all",
            ],
        )

def arcs_kt_jvm_test_suite(name, package, srcs = None, tags = [], deps = []):
    """Defines Kotlin JVM test targets for a directory.

    Defines a Kotlin JVM library (kt_jvm_library) for all of the sources
    in the current directory, and then defines an JVM test target (java_test)
    for each individual test file.

    Args:
      name: name to use for the kt_jvm_library target
      package: package the test classes are in
      srcs: Optional list of source files. If not supplied, a glob of all *.kt
        files will be used.
      tags: optional list of tags for the test targets
      deps: list of dependencies for the kt_jvm_library
    """
    if not srcs:
        srcs = native.glob(["*.kt"])

    arcs_kt_jvm_library(
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
            runtime_deps = [":%s" % name],
            tags = tags,
        )

def _to_jvm_dep(dep):
    return dep

def _to_js_dep(dep):
    last_part = dep.split("/")[-1]

    index_of_colon = dep.find(":")
    if (index_of_colon == -1):
        return dep + (":%s%s" % (last_part, _JS_SUFFIX))
    else:
        return dep + _JS_SUFFIX
