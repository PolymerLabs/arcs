"""Arcs Kotlin WASM rules.

Rules are re-exported in build_defs.bzl -- use those instead.
"""

load("//devtools/build_cleaner/skylark:build_defs.bzl", "register_extension_info")
load(
    "//third_party/bazel_rules/rules_kotlin/kotlin/js:js_library.bzl",
    "kt_js_library",
)
load(
    "//third_party/bazel_rules/rules_kotlin/kotlin/native:native_rules.bzl",
    "kt_native_binary",
    "kt_native_library",
)
load(
    "//third_party/bazel_rules/rules_kotlin/kotlin/native:wasm.bzl",
    "wasm_kt_binary",
)
load(
    "//third_party/java/arcs/build_defs:native.oss.bzl",
    "java_library",
    "java_test",
)
load("//third_party/java/arcs/build_defs:sigh.bzl", "sigh_command")
load("//tools/build_defs/android:rules.bzl", "android_local_test")
load(
    "//tools/build_defs/kotlin:rules.bzl",
    "kt_android_library",
    "kt_jvm_library",
)
load(":kotlin_wasm_annotations.bzl", "kotlin_wasm_annotations")
load(":util.bzl", "merge_lists", "replace_arcs_suffix")

ARCS_SDK_DEPS = ["//third_party/java/arcs"]
_WASM_SUFFIX = "-wasm"
_JS_SUFFIX = "-js"
_KT_SUFFIX = "-kt"

IS_BAZEL = not (hasattr(native, "genmpm"))

# Kotlin Compiler Options
KOTLINC_OPTS = [
    "-Xallow-kotlin-package",
    "-Xinline-classes",
    "-Xmulti-platform",
    "-Xuse-experimental=kotlin.ExperimentalMultiplatform",
]

DISABLED_LINT_CHECKS = [
    "PackageName",
    "TopLevelName",
    "KotlinReflectNeeded",
]

# All supported Kotlin platforms.
ALL_PLATFORMS = ["jvm", "js", "wasm"]

# Default set of platforms for Kotlin libraries.
# TODO: re-enable JS after https://github.com/PolymerLabs/arcs/issues/4772 fixed
DEFAULT_LIBRARY_PLATFORMS = ["jvm"]

# Default set of platforms for Kotlin particles.
DEFAULT_PARTICLE_PLATFORMS = ["jvm"]

def arcs_kt_jvm_library(**kwargs):
    """Wrapper around kt_jvm_library for Arcs.

    Args:
      **kwargs: Set of args to forward to kt_jvm_library
    """
    add_android_constraints = kwargs.pop("add_android_constraints", True)
    constraints = kwargs.pop("constraints", ["android"] if add_android_constraints else [])
    disable_lint_checks = kwargs.pop("disable_lint_checks", [])
    exports = kwargs.pop("exports", [])
    kotlincopts = kwargs.pop("kotlincopts", [])
    kwargs["kotlincopts"] = merge_lists(kotlincopts, KOTLINC_OPTS)
    if not IS_BAZEL:
        kwargs["constraints"] = constraints
        kwargs["disable_lint_checks"] = merge_lists(disable_lint_checks, DISABLED_LINT_CHECKS)

    if exports:
        # kt_jvm_library doesn't support the "exports" property. Instead, we
        # will wrap it in a java_library rule and export everything that is
        # needed from there.
        name = kwargs["name"]
        kt_name = name + _KT_SUFFIX
        kwargs["name"] = kt_name

        exports.append(kt_name)

        if not IS_BAZEL:
            java_kwargs = {"constraints": constraints}
        else:
            java_kwargs = {}

        java_library(
            name = name,
            exports = exports,
            visibility = kwargs["visibility"],
            **java_kwargs
        )

    kt_jvm_library(**kwargs)

def arcs_kt_native_library(**kwargs):
    """Wrapper around kt_native_library for Arcs.

    Args:
      **kwargs: Set of args to forward to kt_native_library
    """
    kotlincopts = kwargs.pop("kotlincopts", [])
    kwargs["kotlincopts"] = merge_lists(kotlincopts, KOTLINC_OPTS)
    kt_native_library(**kwargs)

def arcs_kt_js_library(**kwargs):
    """Wrapper around kt_js_library for Arcs.

    Args:
      **kwargs: Set of args to forward to kt_js_library
    """

    # Don't produce JS libs for blaze.
    if not IS_BAZEL:
        return

    kotlincopts = kwargs.pop("kotlincopts", [])
    kwargs["kotlincopts"] = merge_lists(kotlincopts, KOTLINC_OPTS)
    kt_js_library(**kwargs)

def arcs_kt_library(
        name,
        srcs = [],
        deps = [],
        platforms = DEFAULT_LIBRARY_PLATFORMS,
        exports = None,
        visibility = None,
        testonly = 0,
        add_android_constraints = True):
    """Declares Kotlin library targets for multiple platforms.

    Args:
      name: String; Name of the library
      srcs: List; List of sources
      deps: List; List of dependencies
      platforms: List; List of platforms for which to compile. Valid options
          are: "jvm", "js", "wasm". Defaults to "jvm" and "js".
      exports: List; Optional list of deps to export from this build rule.
      visibility: List; List of visibilities
      add_android_constraints: Adds `constraints = ["android"]` to `kt_jvm_library` rule.
      testonly: Marks this target to be used only for tests.
    """
    _check_platforms(platforms)

    if "jvm" in platforms:
        arcs_kt_jvm_library(
            name = name,
            # Exclude any wasm-specific srcs.
            srcs = [src for src in srcs if not src.endswith(".wasm.kt")],
            deps = [_to_jvm_dep(dep) for dep in deps],
            exports = exports,
            visibility = visibility,
            add_android_constraints = add_android_constraints,
        )

    if "js" in platforms:
        arcs_kt_js_library(
            name = name + _JS_SUFFIX,
            # Exclude any wasm-specific srcs.
            # TODO: jvm srcs will be included here. That is not what we want.
            srcs = [src for src in srcs if not src.endswith(".wasm.kt")],
            deps = [_to_js_dep(dep) for dep in deps],
            visibility = visibility,
        )

    if "wasm" in platforms:
        arcs_kt_native_library(
            name = name + _WASM_SUFFIX,
            # Exclude any jvm-specific srcs.
            srcs = [src for src in srcs if not src.endswith(".jvm.kt")],
            deps = [_to_wasm_dep(dep) for dep in deps],
            visibility = visibility,
        )

def arcs_kt_particles(
        name,
        package,
        srcs = [],
        deps = [],
        platforms = DEFAULT_PARTICLE_PLATFORMS,
        visibility = None,
        add_android_constraints = True):
    """Performs final compilation of wasm and bundling if necessary.

    Args:
      name: name of the target to create
      package: Kotlin package for the particles
      srcs: List of source files to include. Each file must contain a Kotlin
        class of the same name, which must match the name of a particle defined
        in a .arcs file.
      deps: list of dependencies
      platforms: List of platforms for which to compile. Valid options
          are: "jvm", "js", "wasm". Defaults to "jvm" and "js".
      visibility: list of visibilities
      add_android_constraints: Adds `constraints = ["android"]` to `kt_jvm_library` rule.
    """
    _check_platforms(platforms)

    deps = ARCS_SDK_DEPS + deps

    if "jvm" in platforms and "wasm" in platforms:
        fail("Particles can only depend on one of jvm or wasm")

    if "jvm" in platforms:
        arcs_kt_jvm_library(
            name = name + "-jvm",
            srcs = srcs,
            deps = deps,
            visibility = visibility,
            add_android_constraints = add_android_constraints,
        )

    if "js" in platforms:
        arcs_kt_js_library(
            name = name + _JS_SUFFIX,
            srcs = srcs,
            deps = [_to_js_dep(dep) for dep in deps],
            visibility = visibility,
        )

    if "wasm" in platforms:
        wasm_deps = [_to_wasm_dep(dep) for dep in deps]

        # Collect all the sources and annotation files in `wasm_srcs`.
        wasm_srcs = []
        for src in srcs:
            if not src.endswith(".kt"):
                fail("%s is not a Kotlin file (must end in .kt)" % src)
            particle = src.split("/")[-1][:-3]
            wasm_lib = particle + "-lib" + _WASM_SUFFIX
            wasm_annotations_file = particle + ".wasm.kt"

            kotlin_wasm_annotations(
                name = particle + "-wasm-annotations",
                particle = particle,
                # TODO: Package name should be parsed from the
                # Arcs manifest, instead of being passed explicitly.
                package = package,
                out = wasm_annotations_file,
            )
            wasm_srcs.extend([src, wasm_annotations_file])

        # Create a wasm library containing code for all the particles.
        wasm_particle_lib = name + "-lib" + _WASM_SUFFIX
        arcs_kt_native_library(
            name = wasm_particle_lib,
            srcs = wasm_srcs,
            deps = wasm_deps,
        )

        # Create a kt_native_binary that groups everything together.
        native_binary_name = name + _WASM_SUFFIX
        kt_native_binary(
            name = native_binary_name,
            entry_point = "arcs.sdk.main",
            deps = [wasm_particle_lib],
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

def arcs_kt_android_test_suite(name, manifest, package, srcs = None, tags = [], deps = [], data = [], size = "small"):
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
      data: list of files available to the test at runtime
      size: the size of the test, defaults to "small". Options are: "small", "medium", "large", etc.
    """
    if not srcs:
        srcs = native.glob(["*.kt"])

    kt_android_library(
        name = name,
        srcs = srcs,
        manifest = manifest,
        testonly = True,
        deps = deps,
    )

    android_local_test_deps = [":%s" % name]
    if IS_BAZEL:
        android_local_test_deps.append("@robolectric//bazel:android-all")

    for src in srcs:
        class_name = src[:-3]
        android_local_test(
            name = class_name,
            size = size,
            manifest = manifest,
            test_class = "%s.%s" % (package, class_name),
            tags = tags,
            deps = android_local_test_deps,
            data = data,
        )

def arcs_kt_plan(name, src, deps = [], out = None, visibility = None):
    """Converts recipes in manifests into Kotlin Plans.

    Args:
      name: the name of the target to create
      src: an Arcs manifest file
      deps: list of dependencies (other manifests)
      out: the name of the output artifact (a Kotlin file).
      visibility: list of visibilities
    """
    outs = [out] if out != None else [replace_arcs_suffix(src, ".kt")]

    sigh_command(
        name = name,
        srcs = [src],
        outs = outs,
        deps = deps,
        progress_message = "Generating Plans",
        sigh_cmd = "recipe2plan --outdir $(dirname {OUT}) --outfile $(basename {OUT}) {SRC}",
    )

def arcs_kt_jvm_test_suite(name, package, srcs = None, tags = [], deps = [], data = []):
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
      data: list of files available to the test at runtime
    """
    if not srcs:
        srcs = native.glob(["*.kt"])

    arcs_kt_jvm_library(
        name = name,
        srcs = srcs,
        # We don't need this to be Android compatible.
        constraints = [],
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
            data = data,
        )

register_extension_info(
    extension = arcs_kt_android_test_suite,
    label_regex_for_dep = "{extension_name}\\-kt(_DO_NOT_DEPEND_JVM)?",
)

register_extension_info(
    extension = arcs_kt_jvm_library,
    label_regex_for_dep = "{extension_name}\\-kt(_DO_NOT_DEPEND_JVM)?",
)

register_extension_info(
    extension = arcs_kt_jvm_test_suite,
    label_regex_for_dep = "{extension_name}\\-kt(_DO_NOT_DEPEND_JVM)?",
)

register_extension_info(
    extension = arcs_kt_library,
    label_regex_for_dep = "{extension_name}\\-kt(_DO_NOT_DEPEND_JVM)?",
)

register_extension_info(
    extension = arcs_kt_native_library,
    label_regex_for_dep = "{extension_name}",
)

register_extension_info(
    extension = arcs_kt_particles,
    label_regex_for_dep = "{extension_name}\\-kt(_DO_NOT_DEPEND_JVM)?",
)

def _check_platforms(platforms):
    if len(platforms) == 0:
        fail("You must specify at least one platform from: %s" %
             ", ".join(ALL_PLATFORMS))

    for platform in platforms:
        if platform not in ALL_PLATFORMS:
            fail(
                "Unknown platform %s. Expected one of: %s.",
                platform,
                ", ".join(ALL_PLATFORMS),
            )

def _to_jvm_dep(dep):
    return dep

def _to_js_dep(dep):
    return _to_dep_with_suffix(dep, _JS_SUFFIX)

def _to_wasm_dep(dep):
    return _to_dep_with_suffix(dep, _WASM_SUFFIX)

def _to_dep_with_suffix(dep, suffix):
    last_part = dep.split("/")[-1]

    index_of_colon = dep.find(":")
    if (index_of_colon == -1):
        return dep + (":%s%s" % (last_part, suffix))
    else:
        return dep + suffix
