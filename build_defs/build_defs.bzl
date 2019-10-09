load(":run_in_repo.bzl", "EXECUTION_REQUIREMENTS_TAGS", "run_in_repo", "run_in_repo_test")
load("@io_bazel_rules_kotlin//kotlin:kotlin.bzl", "kt_android_library")
load("//build_defs/kotlin_native:build_defs.bzl", "kt_wasm_binary", "kt_wasm_library")

_ANDROID_TARGETS = False

def _output_name(src, file_extension = ""):
    return src.replace(".arcs", "").replace("_", "-").replace(".", "-") + file_extension

def _run_schema2pkg(name, src, out, language_name, language_flag, file_extension):
    """Generates source code for the given .arcs schema file.

    Runs sigh schema2pkg to generate the output.
    """

    if not src.endswith(".arcs"):
        fail("src must be a .arcs file")

    if out == None:
        # Clean up the output name.
        out = _output_name(src, file_extension)

    run_in_repo(
        name = name,
        srcs = [src],
        outs = [out],
        deps = ["//src/tools:schema2pkg_srcs"],
        # TODO: generated header guard should contain whole workspace-relative
        # path to file.
        cmd = "./tools/sigh schema2pkg " +
              language_flag + " " +
              "--outdir $(dirname {OUT}) " +
              "--outfile $(basename {OUT}) " +
              "{SRC}",
        progress_message = "Generating {} entity schemas".format(language_name),
    )

def arcs_cc_schema(name, src, out = None):
    """Generates a C++ header file for the given .arcs schema file."""
    _run_schema2pkg(
        name = name,
        src = src,
        out = out,
        language_name = "C++",
        language_flag = "--cpp",
        file_extension = ".h",
    )

def _android_name(name):
    return name + "_android"

def _android_deps(deps):
    return [_android_name(dep) for dep in deps]

def _wasm_name(name):
    return name + "_wasm"

def _wasm_deps(deps):
    return [_wasm_name(dep) for dep in deps]

def _android_and_wasm_library(name, srcs, deps):
    if _ANDROID_TARGETS:
      kt_android_library(
          name = _android_name(name),
          srcs = srcs,
          deps = _android_deps(deps)
      )

    kt_wasm_library(
        name = _wasm_name(name),
        srcs = srcs,
        deps = _wasm_deps(deps)
    )

def arcs_kt_schema(name, src, out = None, deps = [], wasm_deps = []):
    """Generates a Kotlin file for the given .arcs schema file."""
    out = out or _output_name(src, ".kt")
    _run_schema2pkg(
        name = name + "_genrule",
        src = src,
        out = out,
        language_name = "Kotlin",
        language_flag = "--kotlin",
        file_extension = ".kt",
    )

    return out

def arcs_manifest(name, srcs, deps = []):
    """Generates Kotlin+Wasm Library targets from .arcs file translated to Kotlin."""
    # TODO: when converted to rule()+provider() verify deps are arcs_manifest rules
    outs = [arcs_kt_schema(_output_name(src), src, deps) for src in srcs]
    deps = ["//src/wasm/kotlin:arcs"] + deps

    _android_and_wasm_library(
        name,
        outs,
        deps
    )

def arcs_kt_particle(name, srcs, deps = []):
    """Declares kotlin library targets for Kotlin particle sources."""
    _android_and_wasm_library(name, srcs, ["//src/wasm/kotlin:arcs"] + deps)

def arcs_kt_wasm_binary(name, deps):
    """Performs final compilation of wasm and bundling if necessary."""
    # TODO: add bundling step
    kt_wasm_binary(name = name, srcs = [], deps = _wasm_deps(deps))

def arcs_ts_test(name, src, deps):
    """Runs a TypeScript test file using `sigh test`."""
    run_in_repo_test(
        name = name,
        srcs = [src],
        cmd = "./tools/sigh test --bazel --file {SRC}",
        tags = EXECUTION_REQUIREMENTS_TAGS,
        deps = deps + ["//src:core_srcs"],
    )
