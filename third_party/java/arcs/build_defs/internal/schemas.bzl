"""Rules for generating code from Arcs schemas.

Rules are re-exported in build_defs.bzl -- use those instead.
"""

load("//third_party/java/arcs/build_defs:sigh.bzl", "sigh_command")
load("//third_party/java/arcs/build_defs/internal:util.bzl", "replace_arcs_suffix")
load(":kotlin.bzl", "ARCS_SDK_DEPS", "arcs_kt_library")

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

    sigh_command(
        name = name,
        srcs = [src],
        outs = [out],
        deps = deps,
        progress_message = "Generating {} entity schemas".format(language_name),

        # TODO: generated header guard should contain whole workspace-relative
        # path to file.
        sigh_cmd = "schema2wasm " +
                   language_flag + " " +
                   ("--wasm " if wasm else "") +
                   ("--test_harness " if test_harness else "") +
                   "--outdir $(dirname {OUT}) " +
                   "--outfile $(basename {OUT}) " +
                   "{SRC}",
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

def arcs_kt_schema(name, srcs, deps = [], platforms = ["jvm"], test_harness = True):
    """Generates a Kotlin file for the given .arcs schema file.

    Args:
      name: name of the target to create
      srcs: list of Arcs manifest files to include
      deps: list of imported manifests
      platforms: list of target platforms (current, `jvm` and `wasm` supported).
      test_harness: whether to generate a test harness target
    """
    supported = ["jvm", "wasm"]

    # TODO(#5018)
    if "jvm" not in platforms:
        platforms.append("jvm")

    outs = []
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
                deps = deps,
                wasm = wasm,
                language_flag = "--kotlin",
                language_name = "Kotlin",
            )

    arcs_kt_library(
        name = name,
        srcs = outs,
        platforms = platforms,
        deps = ARCS_SDK_DEPS,
    )

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
            deps = ARCS_SDK_DEPS + [
                ":" + name,
                "//third_party/java/arcs:testing",
                "//third_party/kotlin/kotlinx_coroutines",
            ],
        )
