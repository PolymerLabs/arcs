"""Rules for generating code from Arcs schemas.

Rules are re-exported in build_defs.bzl -- use those instead.
"""

load("//devtools/build_cleaner/skylark:build_defs.bzl", "register_extension_info")
load(":kotlin.bzl", "arcs_kt_library", "arcs_kt_plan")
load(":manifest.bzl", "arcs_manifest")
load(":tools.oss.bzl", "arcs_tool_schema2wasm")
load(":util.bzl", "manifest_only", "replace_arcs_suffix")

def _run_schema2wasm(
        name,
        src,
        deps,
        out,
        language_name,
        language_flag,
        wasm,
        test_harness = False):
    """Generates source code for the given .arcs schema file.

    Runs sigh schema2wasm to generate the output.
    """

    if not src.endswith(".arcs"):
        fail("src must be a .arcs file")

    if type(deps) == str:
        fail("deps must be a list")

    arcs_tool_schema2wasm(
        name = name,
        srcs = [src],
        outs = [out],
        deps = deps,
        language_name = language_name,
        language_flag = language_flag,
        wasm = wasm,
        test_harness = test_harness,
    )

def arcs_cc_schema(name, src, deps = [], out = None):
    """Generates a C++ header file for the given .arcs schema file."""
    _run_schema2wasm(
        name = name + "_genrule",
        src = src,
        deps = deps,
        out = out or replace_arcs_suffix(src, ".h"),
        language_flag = "--cpp",
        language_name = "C++",
        wasm = False,
    )

def arcs_kt_schema(
        name,
        srcs,
        arcs_sdk_deps,
        data = [],
        deps = [],
        platforms = ["jvm"],
        test_harness = False,
        visibility = None):
    """Generates a Kotlin schemas, entities, specs, handle holders, and base particles for input .arcs manifest files.

    Example:

      Direct dependency on this target is required for use.

      ```
          arcs_kt_schema(
            name = "foo_schemas",
            srcs = ["foo.arcs"],
          )

          arcs_kt_library(
            name = "arcs_lib",
            srcs = glob("*.kt"),
            deps = [":foo_schemas"],
          )
      ```

    Args:
      name: name of the target to create
      srcs: list of Arcs manifest files to include
      arcs_sdk_deps: build targets for the Arcs SDK to be included
      data: list of Arcs manifests needed at runtime
      deps: list of imported manifests
      platforms: list of target platforms (currently, `jvm` and `wasm` supported).
      test_harness: whether to generate a test harness target
      visibility: visibility of the generated arcs_kt_library

    Returns:
      Dictionary of:
        "outs": output files. other rules can use this to bundle outputs.
        "deps": deps of those outputs.
    """
    supported = ["jvm", "wasm"]

    # TODO(#5018)
    if "jvm" not in platforms:
        platforms.append("jvm")

    outs = []
    outdeps = []
    for src in srcs:
        for ext in platforms:
            if ext not in supported:
                fail("Platform %s not allowed; only %s supported.".format(ext, supported.join(",")))
            wasm = ext == "wasm"
            genrule_name = replace_arcs_suffix(src, "_genrule_" + ext)
            out = replace_arcs_suffix(src, "_GeneratedSchemas.%s.kt" % ext)
            outs.append(out)
            _run_schema2wasm(
                name = genrule_name,
                src = src,
                out = out,
                deps = deps + data,
                wasm = wasm,
                language_flag = "--kotlin",
                language_name = "Kotlin",
            )

    arcs_kt_library(
        name = name,
        srcs = outs,
        platforms = platforms,
        deps = arcs_sdk_deps,
        visibility = visibility,
    )
    outdeps = outdeps + arcs_sdk_deps

    if (test_harness):
        test_harness_outs = []
        for src in srcs:
            out = replace_arcs_suffix(src, "_TestHarness.kt")
            test_harness_outs.append(out)

            _run_schema2wasm(
                name = replace_arcs_suffix(src, "_genrule_test_harness"),
                src = src,
                out = out,
                deps = deps,
                wasm = False,
                test_harness = True,
                language_flag = "--kotlin",
                language_name = "Kotlin",
            )

        arcs_kt_library(
            name = name + "_test_harness",
            testonly = 1,
            srcs = test_harness_outs,
            deps = arcs_sdk_deps + [
                ":" + name,
                "//third_party/java/arcs:testing",
                "//third_party/kotlin/kotlinx_coroutines",
            ],
        )
    return {"outs": outs, "deps": outdeps}

def arcs_kt_gen(
        name,
        srcs,
        arcs_sdk_deps,
        data = [],
        deps = [],
        platforms = ["jvm"],
        test_harness = False,
        visibility = None):
    """Generates Kotlin files for the given .arcs files.

    This is a convenience wrapper that combines all code generation targets based on arcs files.

    Args:
      name: name of the target to create
      srcs: list of Arcs manifest files to include
      arcs_sdk_deps: build targets for the Arcs SDK to be included
      data: list of Arcs manifests needed at runtime
      deps: list of dependent arcs targets, such as an arcs_kt_gen target in a different package
      platforms: list of target platforms (currently, `jvm` and `wasm` supported).
      test_harness: whether to generate a test harness target
      visibility: visibility of the generated arcs_kt_library
    """

    manifest_name = name + "_manifest"
    schema_name = name + "_schema"
    plan_name = name + "_plan"

    arcs_manifest(
        name = manifest_name,
        srcs = srcs,
        manifest_proto = False,
        deps = manifest_only(deps) + data,
    )

    schema = arcs_kt_schema(
        name = schema_name,
        srcs = srcs,
        arcs_sdk_deps = arcs_sdk_deps,
        deps = deps + [":" + manifest_name],
        platforms = platforms,
        test_harness = test_harness,
        visibility = visibility,
    )
    plan = arcs_kt_plan(
        name = plan_name,
        srcs = srcs,
        arcs_sdk_deps = arcs_sdk_deps,
        data = [":" + manifest_name],
        deps = deps + [":" + schema_name],
        platforms = platforms,
        visibility = visibility,
    )

    # generates combined library. This allows developers to more easily see what is generated.
    arcs_kt_library(
        name = name,
        srcs = depset(schema["outs"] + plan["outs"]).to_list(),
        platforms = platforms,
        deps = depset(schema["deps"] + plan["deps"] + manifest_only(deps, inverse = True)).to_list(),
        visibility = visibility,
    )

register_extension_info(
    extension = arcs_kt_gen,
    label_regex_for_dep = "{extension_name}\\-kt(_DO_NOT_DEPEND_JVM)?",
)
